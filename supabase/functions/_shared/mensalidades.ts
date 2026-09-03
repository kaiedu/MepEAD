import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function respostaJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Configuração segura do Supabase ausente.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function usuarioAutenticado(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Sessão não informada.");
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão inválida ou expirada.");
  const { data: perfil, error: perfilErro } = await supabase.from("usuarios")
    .select("id,auth_id,nome,email,perfil,ativo")
    .eq("auth_id", data.user.id).maybeSingle();
  if (perfilErro || !perfil) throw new Error("Perfil do usuário não encontrado.");
  if (perfil.ativo === false) throw new Error("O acesso deste usuário está desativado.");
  return { supabase, authUser: data.user, perfil };
}

export async function mercadoPago(path: string, init: RequestInit = {}) {
  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!accessToken) throw new Error("Mercado Pago ainda não foi conectado pelo administrador.");
  const resposta = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
      ...(init.headers || {}),
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const mensagem = dados?.message || dados?.error || `Erro ${resposta.status} na integração de pagamento.`;
    throw new Error(String(mensagem));
  }
  return dados;
}

export function portalUrl(req: Request) {
  const configurada = (Deno.env.get("PORTAL_URL") || "").trim();
  if (configurada) return configurada.replace(/\/$/, "");
  const origem = req.headers.get("Origin") || "";
  return origem ? `${origem.replace(/\/$/, "")}/aluno` : "https://mep-ead.com.br/aluno";
}

export function webhookUrl() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/mercadopago-webhook`;
}

export async function garantirPlanoMercadoPago(
  req: Request,
  supabase: ReturnType<typeof adminClient>,
  curso: Record<string, any>,
) {
  const valor = Number(curso.mensalidade_valor || 0);
  if (!curso.mensalidade_ativa || valor <= 0) throw new Error("A mensalidade deste curso não está configurada.");
  const corpo = {
    reason: `MEP EAD - ${String(curso.nome || "Curso").slice(0, 100)}`,
    auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: valor, currency_id: "BRL" },
    back_url: `${portalUrl(req)}/?pagamento=retorno`,
    status: "active",
  };

  let plano: any;
  if (curso.mercadopago_plano_id) {
    try {
      plano = await mercadoPago(`/preapproval_plan/${encodeURIComponent(curso.mercadopago_plano_id)}`, {
        method: "PUT", body: JSON.stringify(corpo),
      });
    } catch {
      plano = null;
    }
  }
  if (!plano) plano = await mercadoPago("/preapproval_plan", { method: "POST", body: JSON.stringify(corpo) });
  if (!plano?.id) throw new Error("O Mercado Pago não retornou o identificador do plano.");

  const { error } = await supabase.from("cursos").update({
    mercadopago_plano_id: String(plano.id),
    mercadopago_plano_status: plano.status || "active",
  }).eq("id", curso.id);
  if (error) throw error;
  return plano;
}
