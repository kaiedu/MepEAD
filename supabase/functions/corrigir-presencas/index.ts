import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, respostaJson, usuarioAutenticado } from "../_shared/mensalidades.ts";

type Alteracao = {
  chamada_id: string;
  aluno_id: string;
  presente: boolean;
};

const chave = (chamadaId: string, alunoId: string) => `${chamadaId}:${alunoId}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respostaJson({ success: false, message: "Método não permitido." }, 405);

  try {
    const { supabase, perfil } = await usuarioAutenticado(req);
    if (String(perfil.perfil).toLowerCase() !== "gestor") {
      return respostaJson({ success: false, message: "Apenas gestores podem corrigir presenças." }, 403);
    }

    const body = await req.json();
    const turmaId = String(body.turma_id || "").trim();
    const aulaId = String(body.aula_id || "").trim();
    const recebidas = Array.isArray(body.alteracoes) ? body.alteracoes : [];
    if (!turmaId || !aulaId) throw new Error("Turma e aula são obrigatórias.");
    if (!recebidas.length) throw new Error("Nenhuma alteração foi informada.");
    if (recebidas.length > 1000) throw new Error("O limite é de 1.000 correções por salvamento.");

    const alteracoesPorChave = new Map<string, Alteracao>();
    for (const item of recebidas) {
      const chamadaId = String(item?.chamada_id || "").trim();
      const alunoId = String(item?.aluno_id || "").trim();
      if (!chamadaId || !alunoId || typeof item?.presente !== "boolean") {
        throw new Error("Existe uma correção com dados inválidos.");
      }
      alteracoesPorChave.set(chave(chamadaId, alunoId), {
        chamada_id: chamadaId,
        aluno_id: alunoId,
        presente: item.presente,
      });
    }
    const alteracoes = [...alteracoesPorChave.values()];
    const chamadaIds = [...new Set(alteracoes.map((item) => item.chamada_id))];
    const alunoIds = [...new Set(alteracoes.map((item) => item.aluno_id))];

    const [{ data: chamadas, error: chamadasErro }, { data: matriculas, error: matriculasErro }] = await Promise.all([
      supabase.from("presencas_chamadas").select("id,aula_id,turma_id")
        .in("id", chamadaIds).eq("aula_id", aulaId).eq("turma_id", turmaId),
      supabase.from("turma_alunos").select("aluno_id")
        .eq("turma_id", turmaId).eq("ativo", true).in("aluno_id", alunoIds),
    ]);
    if (chamadasErro) throw chamadasErro;
    if (matriculasErro) throw matriculasErro;
    const chamadasValidas = new Set((chamadas || []).map((item) => String(item.id)));
    const alunosValidos = new Set((matriculas || []).map((item) => String(item.aluno_id)));
    if (chamadaIds.some((id) => !chamadasValidas.has(id))) throw new Error("Uma chamada não pertence à aula selecionada.");
    if (alunoIds.some((id) => !alunosValidos.has(id))) throw new Error("Um aluno não está ativo na turma selecionada.");

    const { data: existentes, error: existentesErro } = await supabase.from("presencas")
      .select("id,chamada_id,aluno_id").in("chamada_id", chamadaIds).in("aluno_id", alunoIds);
    if (existentesErro) throw existentesErro;
    const registrosPorChave = new Map<string, Array<{ id: string }>>();
    for (const registro of existentes || []) {
      const registroChave = chave(String(registro.chamada_id), String(registro.aluno_id));
      const lista = registrosPorChave.get(registroChave) || [];
      lista.push({ id: String(registro.id) });
      registrosPorChave.set(registroChave, lista);
    }

    const agora = new Date().toISOString();
    const idsPresentes: string[] = [];
    const idsAusentes: string[] = [];
    const insercoes: Record<string, unknown>[] = [];
    for (const alteracao of alteracoes) {
      const registros = registrosPorChave.get(chave(alteracao.chamada_id, alteracao.aluno_id)) || [];
      if (registros.length) {
        (alteracao.presente ? idsPresentes : idsAusentes).push(...registros.map((item) => item.id));
      } else {
        insercoes.push({
          chamada_id: alteracao.chamada_id,
          aula_id: aulaId,
          turma_id: turmaId,
          aluno_id: alteracao.aluno_id,
          presente: alteracao.presente,
          respondido_em: alteracao.presente ? agora : null,
        });
      }
    }

    const operacoes = [];
    if (idsPresentes.length) operacoes.push(supabase.from("presencas").update({ presente: true, respondido_em: agora }).in("id", idsPresentes));
    if (idsAusentes.length) operacoes.push(supabase.from("presencas").update({ presente: false, respondido_em: null }).in("id", idsAusentes));
    if (insercoes.length) operacoes.push(supabase.from("presencas").insert(insercoes));
    const resultados = await Promise.all(operacoes);
    const operacaoComErro = resultados.find((resultado) => resultado.error);
    if (operacaoComErro?.error) throw operacaoComErro.error;

    const { data: verificacao, error: verificacaoErro } = await supabase.from("presencas")
      .select("chamada_id,aluno_id,presente").in("chamada_id", chamadaIds).in("aluno_id", alunoIds);
    if (verificacaoErro) throw verificacaoErro;
    const estados = new Map<string, boolean>();
    for (const registro of verificacao || []) estados.set(chave(String(registro.chamada_id), String(registro.aluno_id)), registro.presente === true);
    const naoConfirmadas = alteracoes.filter((item) => estados.get(chave(item.chamada_id, item.aluno_id)) !== item.presente);
    if (naoConfirmadas.length) throw new Error("O banco não confirmou todas as correções. Nenhum sucesso foi informado à tela.");

    return respostaJson({ success: true, atualizadas: alteracoes.length });
  } catch (erro) {
    console.error("MEP EAD | Erro ao corrigir presenças:", erro);
    return respostaJson({ success: false, message: erro instanceof Error ? erro.message : "Não foi possível corrigir as presenças." }, 400);
  }
});
