const NOME_ABA_ALUNOS = 'Alunos';
const NOME_ABA_CONFIG = 'Configuração';
const PRIMEIRA_LINHA_DADOS = 6;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MEP EAD')
    .addItem('Testar envio para meu e-mail', 'testarEnvio')
    .addSeparator()
    .addItem('Enviar e-mails marcados', 'enviarEmailsMarcados')
    .addToUi();
}

function testarEnvio() {
  const ui = SpreadsheetApp.getUi();
  const emailUsuario = Session.getActiveUser().getEmail();

  if (!emailUsuario) {
    ui.alert('Não foi possível identificar seu e-mail do Google. Use uma conta Google autorizada.');
    return;
  }

  const config = obterConfiguracao_();
  const nomeTeste = 'Aluno de Teste';
  const emailTeste = 'aluno.teste@exemplo.com';
  const senhaTeste = 'SenhaTemporaria123';

  GmailApp.sendEmail(
    emailUsuario,
    '[TESTE] ' + config.assunto,
    criarTextoPlano_(nomeTeste, emailTeste, senhaTeste, config),
    {
      htmlBody: criarHtml_(nomeTeste, emailTeste, senhaTeste, config),
      name: config.nomeRemetente,
      replyTo: config.emailSuporte,
    }
  );

  ui.alert('E-mail de teste enviado para ' + emailUsuario + '. Confira também a pasta Spam.');
}

function enviarEmailsMarcados() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(NOME_ABA_ALUNOS);
  const ui = SpreadsheetApp.getUi();

  if (!aba) {
    ui.alert('A aba "Alunos" não foi encontrada.');
    return;
  }

  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < PRIMEIRA_LINHA_DADOS) {
    ui.alert('Não há alunos preenchidos.');
    return;
  }

  const resposta = ui.alert(
    'Confirmar envio',
    'Os e-mails serão enviados individualmente para todas as linhas marcadas como SIM. Deseja continuar?',
    ui.ButtonSet.YES_NO
  );

  if (resposta !== ui.Button.YES) return;

  const config = obterConfiguracao_();
  const quantidadeLinhas = ultimaLinha - PRIMEIRA_LINHA_DADOS + 1;
  const intervalo = aba.getRange(PRIMEIRA_LINHA_DADOS, 1, quantidadeLinhas, 7);
  const dados = intervalo.getValues();
  let enviados = 0;
  let erros = 0;
  let atingiuLimite = false;

  for (let indice = 0; indice < dados.length; indice++) {
    const linhaPlanilha = PRIMEIRA_LINHA_DADOS + indice;
    const [enviar, nome, email, senha, status] = dados[indice];

    if (normalizar_(enviar) !== 'SIM' || normalizar_(status) === 'ENVIADO') continue;

    if (enviados >= config.limite) {
      atingiuLimite = true;
      break;
    }

    if (!nome || !email || !senha) {
      aba.getRange(linhaPlanilha, 5).setValue('ERRO');
      aba.getRange(linhaPlanilha, 7).setValue('Preencha nome, e-mail e senha temporária.');
      erros++;
      continue;
    }

    if (!emailValido_(String(email))) {
      aba.getRange(linhaPlanilha, 5).setValue('ERRO');
      aba.getRange(linhaPlanilha, 7).setValue('Endereço de e-mail inválido.');
      erros++;
      continue;
    }

    try {
      aba.getRange(linhaPlanilha, 5).setValue('ENVIANDO');
      SpreadsheetApp.flush();

      GmailApp.sendEmail(
        String(email).trim(),
        config.assunto,
        criarTextoPlano_(String(nome), String(email), String(senha), config),
        {
          htmlBody: criarHtml_(String(nome), String(email), String(senha), config),
          name: config.nomeRemetente,
          replyTo: config.emailSuporte,
        }
      );

      aba.getRange(linhaPlanilha, 1).setValue('NÃO');
      aba.getRange(linhaPlanilha, 5).setValue('ENVIADO');
      aba.getRange(linhaPlanilha, 6).setValue(new Date());
      aba.getRange(linhaPlanilha, 7).setValue('Enviado com sucesso.');

      if (config.apagarSenha) {
        aba.getRange(linhaPlanilha, 4).clearContent();
      }

      enviados++;
    } catch (erro) {
      aba.getRange(linhaPlanilha, 5).setValue('ERRO');
      aba.getRange(linhaPlanilha, 7).setValue(String(erro && erro.message ? erro.message : erro));
      erros++;
    }
  }

  const complemento = atingiuLimite
    ? '\nO limite desta execução foi atingido. Execute novamente para continuar.'
    : '';

  ui.alert('Processo concluído', 'Enviados: ' + enviados + '\nErros: ' + erros + complemento, ui.ButtonSet.OK);
}

function obterConfiguracao_() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOME_ABA_CONFIG);
  if (!aba) throw new Error('A aba "Configuração" não foi encontrada.');

  return {
    assunto: String(aba.getRange('B3').getValue()).trim(),
    link: String(aba.getRange('B4').getValue()).trim(),
    emailSuporte: String(aba.getRange('B5').getValue()).trim(),
    nomeRemetente: String(aba.getRange('B6').getValue()).trim(),
    apagarSenha: normalizar_(aba.getRange('B7').getValue()) === 'SIM',
    limite: Math.max(1, Math.min(100, Number(aba.getRange('B8').getValue()) || 40)),
  };
}

function criarHtml_(nome, email, senha, config) {
  const n = escaparHtml_(nome);
  const e = escaparHtml_(email);
  const s = escaparHtml_(senha);
  const link = escaparAtributo_(config.link);
  const suporte = escaparHtml_(config.emailSuporte);
  const suporteHref = escaparAtributo_(config.emailSuporte);

  return `<!doctype html>
  <html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f3f4f6;color:#202124;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${n}, seu acesso ao MEP EAD está pronto.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;width:100%">
      <tr><td align="center" style="padding:32px 12px">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#fff;width:100%;max-width:600px;border-radius:18px;overflow:hidden">
          <tr><td align="center" style="padding:28px 32px 22px;background:#090909;border-bottom:4px solid #ef1b1b">
            <img src="https://mep-ead.vercel.app/assets/logos/logo.png" width="250" alt="MEP EAD — Igreja Propósito em Cristo" style="display:block;width:250px;max-width:85%;height:auto;border:0">
          </td></tr>
          <tr><td style="padding:38px 42px 14px">
            <p style="margin:0 0 10px;color:#ef1b1b;font-size:13px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase">Bem-vindo(a) ao MEP EAD</p>
            <h1 style="margin:0 0 18px;color:#111;font-size:28px;line-height:1.25">Olá, ${n}! 👋</h1>
            <p style="margin:0;color:#51545a;font-size:16px;line-height:1.65">É uma alegria ter você conosco. Seu cadastro foi concluído e seu acesso à plataforma de estudos já está disponível.</p>
          </td></tr>
          <tr><td style="padding:18px 42px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff7f7;border:1px solid #ffd7d7;border-radius:12px">
              <tr><td style="padding:24px">
                <p style="margin:0 0 17px;font-size:15px;font-weight:bold">Seus dados de primeiro acesso</p>
                <p style="margin:0 0 7px;color:#74777c;font-size:12px;font-weight:bold;text-transform:uppercase">E-mail</p>
                <p style="margin:0 0 19px;color:#111;font-size:16px;word-break:break-all">${e}</p>
                <p style="margin:0 0 7px;color:#74777c;font-size:12px;font-weight:bold;text-transform:uppercase">Senha temporária</p>
                <p style="margin:0;color:#c91414;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;letter-spacing:1px;word-break:break-all">${s}</p>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center" style="padding:14px 42px 28px">
            <a href="${link}" target="_blank" style="display:inline-block;padding:15px 30px;background:#ef1b1b;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:9px">Acessar o MEP EAD →</a>
          </td></tr>
          <tr><td style="padding:0 42px 34px">
            <h2 style="margin:0 0 14px;font-size:18px">Como fazer seu primeiro acesso</h2>
            <p style="margin:0 0 9px;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">1.</b> Clique no botão acima para abrir a plataforma.</p>
            <p style="margin:0 0 9px;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">2.</b> Entre com o e-mail e a senha temporária desta mensagem.</p>
            <p style="margin:0 0 22px;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">3.</b> Crie uma nova senha pessoal quando solicitado.</p>
            <p style="margin:0;padding-top:20px;border-top:1px solid #e8eaed;color:#6f7378;font-size:13px;line-height:1.55">🔒 Por segurança, não compartilhe sua senha. A equipe do MEP nunca solicitará sua senha por e-mail ou mensagem.</p>
          </td></tr>
          <tr><td align="center" style="padding:25px 32px;background:#111;color:#c6c7ca;font-size:12px;line-height:1.6">
            <strong style="color:#fff">Equipe MEP EAD</strong><br>Igreja Propósito em Cristo<br>
            Precisa de ajuda? <a href="mailto:${suporteHref}" style="color:#ff5555;text-decoration:none">${suporte}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function criarTextoPlano_(nome, email, senha, config) {
  return `Olá, ${nome}!

Seu acesso ao MEP EAD está pronto.

E-mail: ${email}
Senha temporária: ${senha}

Acesse: ${config.link}

No primeiro acesso, entre com esses dados e cadastre uma nova senha pessoal.
Por segurança, não compartilhe sua senha.

Equipe MEP EAD
Suporte: ${config.emailSuporte}`;
}

function normalizar_(valor) {
  return String(valor || '').trim().toUpperCase();
}

function emailValido_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escaparHtml_(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escaparAtributo_(valor) {
  return escaparHtml_(valor).replace(/`/g, '&#096;');
}
