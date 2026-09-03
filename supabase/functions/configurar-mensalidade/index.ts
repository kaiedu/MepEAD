import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, garantirPlanoMercadoPago, respostaJson, usuarioAutenticado } from "../_shared/mensalidades.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respostaJson({ success: false, message: "Método não permitido." }, 405);
  try {
    const { supabase, perfil } = await usuarioAutenticado(req);
    if (String(perfil.perfil).toLowerCase() !== "gestor") return respostaJson({ success: false, message: "Apenas gestores podem configurar mensalidades." }, 403);
    const body = await req.json();
    const cursoId = String(body.curso_id || "").trim();
    const ativa = body.ativa === true;
    const valor = Number(body.valor);
    const modo = String(body.bloqueio_modo || "nao_bloquear");
    const dias = modo === "apos_dias" ? Number(body.carencia_dias) : 0;
    if (!cursoId) throw new Error("Curso não informado.");
    if (ativa && (!Number.isFinite(valor) || valor <= 0)) throw new Error("Informe um valor mensal válido.");
    if (!["nao_bloquear", "imediato", "apos_dias"].includes(modo)) throw new Error("Política de bloqueio inválida.");
    if (modo === "apos_dias" && (!Number.isInteger(dias) || dias < 1 || dias > 365)) throw new Error("Prazo de tolerância inválido.");

    const { data: atual, error: buscaErro } = await supabase.from("cursos").select("*").eq("id", cursoId).maybeSingle();
    if (buscaErro || !atual) throw buscaErro || new Error("Curso não encontrado.");
    const regraMudou = atual.mensalidade_ativa !== ativa || atual.mensalidade_bloqueio_modo !== modo || Number(atual.mensalidade_carencia_dias || 0) !== dias;
    const atualizacao: Record<string, unknown> = {
      mensalidade_ativa: ativa,
      mensalidade_valor: ativa ? valor : null,
      mensalidade_bloqueio_modo: modo,
      mensalidade_carencia_dias: dias,
    };
    if (regraMudou || !atual.mensalidade_configurada_em) atualizacao.mensalidade_configurada_em = new Date().toISOString();
    const { data: curso, error } = await supabase.from("cursos").update(atualizacao).eq("id", cursoId).select().single();
    if (error) throw error;

    let integracao = curso.mercadopago_plano_id ? "conectada" : "pendente";
    let aviso: string | null = null;
    if (ativa && Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")) {
      try {
        await garantirPlanoMercadoPago(req, supabase, curso);
        integracao = "conectada";
      } catch (erro) {
        integracao = "pendente";
        aviso = erro instanceof Error ? erro.message : "Não foi possível sincronizar o plano agora.";
      }
    } else if (ativa) {
      aviso = "Configuração salva. Falta conectar a conta do Mercado Pago para iniciar cobranças reais.";
    }
    return respostaJson({ success: true, curso, integracao, aviso });
  } catch (erro) {
    return respostaJson({ success: false, message: erro instanceof Error ? erro.message : "Não foi possível salvar a mensalidade." }, 400);
  }
});
