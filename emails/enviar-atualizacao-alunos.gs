const NOME_ABA_ALUNOS = 'Alunos';
const NOME_ABA_CONFIG = 'Configuração';
const PRIMEIRA_LINHA_DADOS = 6;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MEP EAD — Atualização')
    .addItem('Preparar planilha', 'prepararPlanilhaAtualizacao')
    .addSeparator()
    .addItem('Testar envio para meu e-mail', 'testarEnvio')
    .addItem('Enviar e-mails marcados', 'enviarEmailsMarcados')
    .addToUi();
}

function prepararPlanilhaAtualizacao() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const alunos = planilha.getSheetByName(NOME_ABA_ALUNOS) || planilha.insertSheet(NOME_ABA_ALUNOS);
  const config = planilha.getSheetByName(NOME_ABA_CONFIG) || planilha.insertSheet(NOME_ABA_CONFIG);

  alunos.getRange('A1:F1').breakApart().merge();
  alunos.getRange('A1').setValue('MEP EAD | COMUNICADO DE ATUALIZAÇÃO DO PORTAL');
  alunos.getRange('A2:F2').breakApart().merge();
  alunos.getRange('A2').setValue('Preencha nome e e-mail, marque SIM e utilize o menu MEP EAD — Atualização para disparar.');
  alunos.getRange('A5:F5').setValues([['ENVIAR?', 'NOME DO ALUNO', 'E-MAIL', 'STATUS', 'DATA DO ENVIO', 'DETALHES']]);
  alunos.getRange('A1:F1').setBackground('#090909').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  alunos.getRange('A2:F2').setBackground('#fff2f2').setFontColor('#7b2020').setFontSize(10).setHorizontalAlignment('center');
  alunos.getRange('A5:F5').setBackground('#ef1b1b').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  alunos.setFrozenRows(5);
  alunos.setColumnWidth(1, 90);
  alunos.setColumnWidth(2, 230);
  alunos.setColumnWidth(3, 280);
  alunos.setColumnWidth(4, 110);
  alunos.setColumnWidth(5, 155);
  alunos.setColumnWidth(6, 300);
  alunos.getRange('E6:E1000').setNumberFormat('dd/MM/yyyy HH:mm');
  alunos.getRange('A6:A1000').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['SIM', 'NÃO'], true).setAllowInvalid(false).build()
  );
  if (alunos.getBandings().length === 0) {
    alunos.getRange('A6:F1000').applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  }

  config.getRange('A1:B1').breakApart().merge();
  config.getRange('A1').setValue('CONFIGURAÇÃO DO DISPARO');
  config.getRange('A3:A7').setValues([
    ['Assunto do e-mail'],
    ['Link do portal'],
    ['E-mail de suporte'],
    ['Nome do remetente'],
    ['Limite por execução'],
  ]);
  const padroes = [
    ['O MEP EAD está de cara nova — confira as novidades'],
    ['https://mep-ead.vercel.app/'],
    ['comunicacaoipecsantaluzia@gmail.com'],
    ['Equipe MEP EAD'],
    [40],
  ];
  const valoresAtuais = config.getRange('B3:B7').getValues();
  valoresAtuais.forEach((linha, indice) => {
    if (linha[0] === '' || linha[0] === null) config.getRange(3 + indice, 2).setValue(padroes[indice][0]);
  });
  config.getRange('A1:B1').setBackground('#090909').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  config.getRange('A3:A7').setBackground('#fff2f2').setFontWeight('bold');
  config.getRange('B3:B7').setBackground('#ffffff');
  config.setColumnWidth(1, 190);
  config.setColumnWidth(2, 430);
  config.setFrozenRows(1);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Planilha preparada. Preencha os alunos na aba "Alunos" e marque SIM nas linhas que deseja enviar.');
}

function testarEnvio() {
  const ui = SpreadsheetApp.getUi();
  const emailUsuario = Session.getActiveUser().getEmail();
  if (!emailUsuario) {
    ui.alert('Não foi possível identificar seu e-mail do Google. Use uma conta Google autorizada.');
    return;
  }

  const config = obterConfiguracao_();
  GmailApp.sendEmail(
    emailUsuario,
    '[TESTE] ' + config.assunto,
    criarTextoPlano_('Aluno de Teste', config),
    {
      htmlBody: criarHtml_('Aluno de Teste', config),
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
    ui.alert('A aba "Alunos" não foi encontrada. Use primeiro a opção "Preparar planilha".');
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
  const dados = aba.getRange(PRIMEIRA_LINHA_DADOS, 1, quantidadeLinhas, 6).getValues();
  let enviados = 0;
  let erros = 0;
  let atingiuLimite = false;

  for (let indice = 0; indice < dados.length; indice++) {
    const linhaPlanilha = PRIMEIRA_LINHA_DADOS + indice;
    const [enviar, nome, email, status] = dados[indice];
    if (normalizar_(enviar) !== 'SIM' || normalizar_(status) === 'ENVIADO') continue;

    if (enviados >= config.limite) {
      atingiuLimite = true;
      break;
    }

    if (!nome || !email) {
      aba.getRange(linhaPlanilha, 4).setValue('ERRO');
      aba.getRange(linhaPlanilha, 6).setValue('Preencha o nome e o e-mail do aluno.');
      erros++;
      continue;
    }
    if (!emailValido_(String(email))) {
      aba.getRange(linhaPlanilha, 4).setValue('ERRO');
      aba.getRange(linhaPlanilha, 6).setValue('Endereço de e-mail inválido.');
      erros++;
      continue;
    }

    try {
      aba.getRange(linhaPlanilha, 4).setValue('ENVIANDO');
      SpreadsheetApp.flush();
      GmailApp.sendEmail(
        String(email).trim(),
        config.assunto,
        criarTextoPlano_(String(nome), config),
        {
          htmlBody: criarHtml_(String(nome), config),
          name: config.nomeRemetente,
          replyTo: config.emailSuporte,
        }
      );
      aba.getRange(linhaPlanilha, 1).setValue('NÃO');
      aba.getRange(linhaPlanilha, 4).setValue('ENVIADO');
      aba.getRange(linhaPlanilha, 5).setValue(new Date());
      aba.getRange(linhaPlanilha, 6).setValue('Enviado com sucesso.');
      enviados++;
    } catch (erro) {
      aba.getRange(linhaPlanilha, 4).setValue('ERRO');
      aba.getRange(linhaPlanilha, 6).setValue(String(erro && erro.message ? erro.message : erro));
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
    limite: Math.max(1, Math.min(100, Number(aba.getRange('B7').getValue()) || 40)),
  };
}

function criarHtml_(nome, config) {
  const n = escaparHtml_(nome);
  const link = escaparAtributo_(config.link);
  const suporte = escaparHtml_(config.emailSuporte);
  const suporteHref = escaparAtributo_(config.emailSuporte);

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f3f4f6;color:#202124;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${n}, conheça o novo portal MEP EAD e as regras de presença.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;width:100%"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#fff;width:100%;max-width:600px;border-radius:18px;overflow:hidden">
    <tr><td align="center" style="padding:28px 32px 22px;background:#090909;border-bottom:4px solid #ef1b1b"><img src="https://mep-ead.vercel.app/assets/logos/logo.png" width="250" alt="MEP EAD — Igreja Propósito em Cristo" style="display:block;width:250px;max-width:85%;height:auto;border:0"></td></tr>
    <tr><td style="padding:38px 42px 16px"><p style="margin:0 0 10px;color:#ef1b1b;font-size:13px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase">Novidades no portal do aluno</p><h1 style="margin:0 0 18px;color:#111;font-size:28px;line-height:1.25">Olá, ${n}! O MEP EAD está de cara nova.</h1><p style="margin:0;color:#51545a;font-size:16px;line-height:1.65">Atualizamos a plataforma para deixar sua experiência mais clara, organizada e agradável. Seus cursos, aulas e caminhos de acesso continuam no mesmo lugar, agora com uma interface renovada.</p></td></tr>
    <tr><td align="center" style="padding:12px 42px 30px"><a href="${link}" target="_blank" style="display:inline-block;padding:15px 30px;background:#ef1b1b;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:9px">Acessar o novo portal →</a></td></tr>
    <tr><td style="padding:0 42px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff7f7;border:1px solid #ffd7d7;border-radius:12px"><tr><td style="padding:25px"><p style="margin:0 0 8px;color:#ef1b1b;font-size:12px;font-weight:bold;text-transform:uppercase">Importante</p><h2 style="margin:0 0 12px;font-size:20px">Como funciona a presença nas aulas ao vivo</h2><p style="margin:0 0 13px;color:#5f6368;font-size:15px;line-height:1.6">Durante cada aula ao vivo, aparecerão <strong>várias chamadas de presença</strong>. Cada aviso ficará na tela por apenas <strong>15 segundos</strong>, e você deverá confirmar dentro desse tempo.</p><p style="margin:0;color:#5f6368;font-size:15px;line-height:1.6">Para que a presença do dia seja computada, você precisa responder a <strong>pelo menos 60% das chamadas</strong> da aula.</p></td></tr></table></td></tr>
    <tr><td style="padding:4px 42px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="48%" valign="top" style="padding:18px;background:#fff2f2;border:1px solid #ffd0d0;border-radius:10px"><p style="margin:0 0 6px;color:#ba1717;font-size:22px;font-weight:bold">2 de 5</p><p style="margin:0 0 5px;font-size:14px;font-weight:bold">40% respondidas</p><p style="margin:0;color:#74777c;font-size:13px;line-height:1.45">Não atingiu o mínimo. A presença não será computada.</p></td><td width="4%">&nbsp;</td><td width="48%" valign="top" style="padding:18px;background:#f1fbf5;border:1px solid #bfe8ce;border-radius:10px"><p style="margin:0 0 6px;color:#137a3b;font-size:22px;font-weight:bold">3 de 5</p><p style="margin:0 0 5px;font-size:14px;font-weight:bold">60% respondidas</p><p style="margin:0;color:#657069;font-size:13px;line-height:1.45">Atingiu o mínimo. A presença será computada.</p></td></tr></table></td></tr>
    <tr><td style="padding:0 42px 27px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#111;border-radius:12px"><tr><td style="padding:21px 22px"><p style="margin:0 0 6px;color:#fff;font-size:15px;font-weight:bold">As chamadas não emitem som</p><p style="margin:0;color:#c3c4c7;font-size:14px;line-height:1.55">Mantenha a aula aberta e visível e acompanhe a transmissão de fato. Se você não estiver olhando para a tela, poderá não ver o aviso a tempo.</p></td></tr></table></td></tr>
    <tr><td style="padding:0 42px 34px"><h2 style="margin:0 0 15px;font-size:19px">Seu perfil também ganhou novidades</h2><p style="margin:0 0 9px;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">✓</b> Adicione ou atualize sua foto de perfil.</p><p style="margin:0 0 9px;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">✓</b> Cadastre seus telefones de contato em <strong>Seu perfil</strong>.</p><p style="margin:0;color:#5f6368;font-size:15px;line-height:1.5"><b style="color:#ef1b1b">✓</b> Adicione o portal à tela inicial do celular quando o convite aparecer.</p></td></tr>
    <tr><td align="center" style="padding:25px 32px;background:#111;color:#c6c7ca;font-size:12px;line-height:1.6"><strong style="color:#fff">Equipe MEP EAD</strong><br>Igreja Propósito em Cristo<br>Precisa de ajuda? <a href="mailto:${suporteHref}" style="color:#ff5555;text-decoration:none">${suporte}</a></td></tr>
  </table></td></tr></table></body></html>`;
}

function criarTextoPlano_(nome, config) {
  return `Olá, ${nome}!

O MEP EAD está de cara nova. Atualizamos o portal para deixar sua experiência mais clara, organizada e agradável.

COMO FUNCIONA A PRESENÇA
Durante as aulas ao vivo, aparecerão várias chamadas de presença na tela. Cada aviso ficará disponível por apenas 15 segundos.

Para que a presença do dia seja computada, você deve responder a pelo menos 60% das chamadas da aula.

Exemplo com 5 chamadas:
- 2 de 5 = 40%: presença não computada.
- 3 de 5 = 60%: presença computada.

ATENÇÃO: as chamadas não emitem som. Mantenha a aula aberta e visível e acompanhe a transmissão para não perder os avisos.

SEU PERFIL
Agora você pode adicionar uma foto e cadastrar seus telefones de contato na área Seu perfil. Também poderá adicionar o portal à tela inicial do celular quando o convite aparecer.

Acesse: ${config.link}

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
