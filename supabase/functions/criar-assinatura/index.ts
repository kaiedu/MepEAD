import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, garantirPlanoMercadoPago, mercadoPago, portalUrl, respostaJson, usuarioAutenticado, webhookUrl } from "../_shared/mensalidades.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respostaJson({ success: false, message: "Método não permitido." }, 405);
  try {
    const { supabase, perfil } = await usuarioAutenticado(req);
    if (String(perfil.perfil).toLowerCase() !== "aluno") return respostaJson({ success: false, message: "Esta assinatura é exclusiva para alunos." }, 403);
    const body = await req.json();
    const cursoId = String(body.curso_id || "").trim();
    if (!cursoId) throw new Error("Curso não informado.");
    const { data: curso, error: cursoErro } = await supabase.from("cursos").select("*").eq("id", cursoId).maybeSingle();
    if (cursoErro || !curso) throw cursoErro || new Error("Curso não encontrado.");
    if (!curso.mensalidade_ativa || Number(curso.mensalidade_valor || 0) <= 0) throw new Error("Este curso não possui mensalidade ativa.");

    const { data: matricula, error: matriculaErro } = await supabase.from("turma_alunos").select("id,turmas!inner(curso_id)")
      .eq("aluno_id", perfil.id).eq("ativo", true).eq("turmas.curso_id", cursoId).limit(1).maybeSingle();
    if (matriculaErro || !matricula) throw matriculaErro || new Error("Você não está matriculado neste curso.");

    const { data: existente } = await supabase.from("assinaturas_curso").select("*").eq("aluno_id", perfil.id).eq("curso_id", cursoId).maybeSingle();
    if (existente?.status === "authorized") return respostaJson({ success: true, status: "authorized", message: "Sua mensalidade já está ativa." });
    if (existente?.checkout_url && existente?.mercadopago_assinatura_id) return respostaJson({ success: true, status: existente.status, checkout_url: existente.checkout_url });

    const plano = await garantirPlanoMercadoPago(req, supabase, curso);
    const assinaturaId = existente?.id || crypto.randomUUID();
    const referencia = existente?.referencia_externa || `mep:${assinaturaId}`;
    const base = {
      id: assinaturaId, aluno_id: perfil.id, curso_id: cursoId,
      referencia_externa: referencia, status: "pending", email_pagador: perfil.email,
      valor_mensal: Number(curso.mensalidade_valor), status_atualizado_em: new Date().toISOString(),
    };
    const { error: preparacaoErro } = await supabase.from("assinaturas_curso").upsert(base, { onConflict: "aluno_id,curso_id" });
    if (preparacaoErro) throw preparacaoErro;

    const assinatura = await mercadoPago("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        preapproval_plan_id: String(plano.id),
        reason: `MEP EAD - ${String(curso.nome || "Curso").slice(0, 100)}`,
        external_reference: referencia,
        payer_email: perfil.email,
        back_url: `${portalUrl(req)}/?pagamento=retorno&curso=${encodeURIComponent(cursoId)}`,
        notification_url: webhookUrl(),
        status: "pending",
      }),
    });
    if (!assinatura?.id || !assinatura?.init_point) throw new Error("O Mercado Pago não retornou o endereço da assinatura.");
    const { error: updateErro } = await supabase.from("assinaturas_curso").update({
      mercadopago_assinatura_id: String(assinatura.id),
      status: assinatura.status || "pending",
      checkout_url: assinatura.init_point,
      proxima_cobranca_em: assinatura.next_payment_date || null,
      status_atualizado_em: new Date().toISOString(),
    }).eq("id", assinaturaId);
    if (updateErro) throw updateErro;
    return respostaJson({ success: true, status: assinatura.status || "pending", checkout_url: assinatura.init_point });
  } catch (erro) {
    return respostaJson({ success: false, message: erro instanceof Error ? erro.message : "Não foi possível iniciar a assinatura." }, 400);
  }
});
