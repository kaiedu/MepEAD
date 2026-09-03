import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, mercadoPago, respostaJson } from "../_shared/mensalidades.ts";

async function hmacHex(chave: string, mensagem: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(chave), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(mensagem));
  return [...new Uint8Array(assinatura)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function assinaturaValida(req: Request, dataId: string) {
  const segredo = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  const xSignature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!segredo || !xSignature || !requestId) return true;
  const partes = Object.fromEntries(xSignature.split(",").map(item => item.trim().split("=", 2)));
  if (!partes.ts || !partes.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
  return (await hmacHex(segredo, manifest)) === partes.v1;
}

async function atualizarAssinatura(supabase: ReturnType<typeof adminClient>, recurso: any) {
  const referencia = String(recurso.external_reference || "");
  const localId = referencia.startsWith("mep:") ? referencia.slice(4) : null;
  let consulta = supabase.from("assinaturas_curso").select("*");
  consulta = localId ? consulta.eq("id", localId) : consulta.eq("mercadopago_assinatura_id", String(recurso.id));
  const { data: local, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!local) return null;
  const status = String(recurso.status || local.status || "pending");
  const regular = status === "authorized";
  const { error: updateErro } = await supabase.from("assinaturas_curso").update({
    mercadopago_assinatura_id: String(recurso.id),
    status,
    email_pagador: recurso.payer_email || local.email_pagador,
    valor_mensal: Number(recurso.auto_recurring?.transaction_amount || local.valor_mensal),
    proxima_cobranca_em: recurso.next_payment_date || local.proxima_cobranca_em,
    inadimplente_desde: regular ? null : (local.inadimplente_desde || new Date().toISOString()),
    status_atualizado_em: new Date().toISOString(),
  }).eq("id", local.id);
  if (updateErro) throw updateErro;
  return local;
}

async function atualizarPagamentoAutorizado(supabase: ReturnType<typeof adminClient>, recurso: any) {
  const preapprovalId = String(recurso.preapproval_id || recurso.subscription_id || "");
  if (!preapprovalId) return null;
  const { data: assinatura, error } = await supabase.from("assinaturas_curso").select("*")
    .eq("mercadopago_assinatura_id", preapprovalId).maybeSingle();
  if (error) throw error;
  if (!assinatura) return null;
  const status = String(recurso.status || "pending").toLowerCase();
  const aprovado = status === "approved" || status === "processed";
  const aguardando = ["pending", "waiting for gateway", "recycling"].includes(status);
  const pagamento = {
    assinatura_id: assinatura.id,
    mercadopago_pagamento_id: recurso.payment_id ? String(recurso.payment_id) : null,
    mercadopago_pagamento_autorizado_id: String(recurso.id),
    status,
    valor: Number(recurso.transaction_amount || recurso.amount || assinatura.valor_mensal),
    moeda: recurso.currency_id || "BRL",
    pago_em: aprovado ? (recurso.payment?.date_approved || recurso.date_created || new Date().toISOString()) : null,
    vencimento_em: recurso.debit_date || null,
    detalhe_status: recurso.status_detail || null,
    dados_processador: { id: recurso.id, payment_id: recurso.payment_id || null, status },
  };
  const { error: pagamentoErro } = await supabase.from("pagamentos_mensalidades")
    .upsert(pagamento, { onConflict: "mercadopago_pagamento_autorizado_id" });
  if (pagamentoErro) throw pagamentoErro;
  const atualizacao: Record<string, unknown> = {
    ultimo_pagamento_status: status,
    status_atualizado_em: new Date().toISOString(),
  };
  if (aprovado) {
    atualizacao.ultimo_pagamento_em = pagamento.pago_em;
    atualizacao.inadimplente_desde = null;
  } else if (!aguardando || status === "recycling") {
    atualizacao.inadimplente_desde = assinatura.inadimplente_desde || new Date().toISOString();
  }
  const { error: assinaturaErro } = await supabase.from("assinaturas_curso").update(atualizacao).eq("id", assinatura.id);
  if (assinaturaErro) throw assinaturaErro;
  return assinatura;
}

serve(async (req) => {
  if (req.method !== "POST") return respostaJson({ received:true });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const tipo = String(body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "");
    const dataId = String(url.searchParams.get("data.id") || url.searchParams.get("id") || body.data?.id || body.id || "");
    if (!dataId) return respostaJson({ received:true, ignored:"sem_identificador" });
    if (!(await assinaturaValida(req, dataId))) return respostaJson({ received:false, message:"Assinatura do webhook inválida." }, 401);

    const supabase = adminClient();
    if (tipo.includes("subscription_preapproval") && !tipo.includes("plan")) {
      const recurso = await mercadoPago(`/preapproval/${encodeURIComponent(dataId)}`);
      await atualizarAssinatura(supabase, recurso);
    } else if (tipo.includes("subscription_authorized_payment")) {
      const recurso = await mercadoPago(`/authorized_payments/${encodeURIComponent(dataId)}`);
      await atualizarPagamentoAutorizado(supabase, recurso);
    } else if (tipo === "payment") {
      const pagamento = await mercadoPago(`/v1/payments/${encodeURIComponent(dataId)}`);
      const preapprovalId = pagamento.metadata?.preapproval_id || pagamento.subscription_id;
      if (preapprovalId) {
        await atualizarPagamentoAutorizado(supabase, {
          id: `payment-${pagamento.id}`,
          preapproval_id: preapprovalId,
          payment_id: pagamento.id,
          status: pagamento.status,
          status_detail: pagamento.status_detail,
          transaction_amount: pagamento.transaction_amount,
          currency_id: pagamento.currency_id,
          date_created: pagamento.date_approved || pagamento.date_created,
        });
      }
    }
    return respostaJson({ received:true });
  } catch (erro) {
    console.error("MEP EAD | WEBHOOK MENSALIDADES", erro);
    return respostaJson({ received:false, message:erro instanceof Error ? erro.message : "Erro ao processar notificação." }, 500);
  }
});
