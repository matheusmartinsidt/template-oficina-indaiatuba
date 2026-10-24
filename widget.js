/*
 * Widget de chat do Atendimento IA. Para instalar em qualquer site, uma linha antes de </body>:
 *
 *   <script src="widget.js" defer
 *     data-api="https://SEU-BACKEND/webhook"   (endereço dos webhooks)
 *     data-cliente="torque-indaiatuba"          (chave do cliente em config/clientes.json)
 *     data-titulo="Torque Auto Center"          (opcional)
 *     data-saudacao="Olá! Como posso ajudar?"   (opcional)
 *     data-cor="#b9412e"></script>              (opcional; padrão: a variável CSS --accent do site)
 */
(() => {
  const tag = document.currentScript;
  const opt = tag ? tag.dataset : {};
  const API = (opt.api || '/webhook').replace(/\/$/, '');
  const CLIENTE = opt.cliente || '';
  const TITULO = opt.titulo || 'Atendimento';
  const SAUDACAO = opt.saudacao || 'Olá! Como posso ajudar?';
  if (!CLIENTE) { console.warn('[atendimento] data-cliente não informado'); return; }

  const corDoSite = () => opt.cor
    || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    || '#1f7a5a';

  // Sessão por aba: o servidor guarda o histórico com esse id
  let sessao;
  try {
    sessao = sessionStorage.getItem('atendimento-' + CLIENTE);
    if (!sessao) { sessao = crypto.randomUUID(); sessionStorage.setItem('atendimento-' + CLIENTE, sessao); }
  } catch (e) { sessao = crypto.randomUUID(); }

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483000;right:0;bottom:0;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .fab { position: fixed; right: 20px; bottom: 20px; width: 58px; height: 58px; border-radius: 50%; border: 0;
    background: var(--cor); color: #fff; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.25);
    display: grid; place-items: center; transition: transform .15s; }
  .fab:hover { transform: scale(1.06); }
  .fab:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid var(--cor); outline-offset: 2px; }
  .fab svg { width: 26px; height: 26px; }
  .painel { position: fixed; right: 20px; bottom: 90px; width: 360px; max-width: calc(100vw - 32px);
    height: 520px; max-height: calc(100vh - 120px); background: #fff; color: #1b1b1b; border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,.25); display: flex; flex-direction: column; overflow: hidden; }
  .painel[hidden] { display: none; }
  .topo { background: var(--cor); color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .topo strong { font-size: 15px; display: block; }
  .topo small { font-size: 12px; opacity: .9; }
  .fechar { background: transparent; border: 0; color: #fff; font-size: 24px; line-height: 1; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
  .msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; background: #f6f6f4; }
  .m { max-width: 85%; padding: 9px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45; white-space: pre-wrap; word-wrap: break-word; }
  .m.eu { align-self: flex-end; background: var(--cor); color: #fff; border-bottom-right-radius: 4px; }
  .m.ia { align-self: flex-start; background: #fff; border: 1px solid #e5e5e0; border-bottom-left-radius: 4px; }
  .m.aviso { align-self: center; background: transparent; color: #6b6b66; font-size: 12px; text-align: center; padding: 2px 8px; }
  .digitando { display: inline-flex; gap: 4px; }
  .digitando i { width: 6px; height: 6px; border-radius: 50%; background: #999; animation: p 1s infinite; }
  .digitando i:nth-child(2) { animation-delay: .15s; } .digitando i:nth-child(3) { animation-delay: .3s; }
  @keyframes p { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
  form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e5e5e0; background: #fff; }
  input { flex: 1; min-width: 0; font-size: 15px; padding: 10px 12px; border: 1px solid #d5d5cf; border-radius: 10px; color: #1b1b1b; background: #fff; }
  .enviar { background: var(--cor); color: #fff; border: 0; border-radius: 10px; padding: 0 14px; font-weight: 600; cursor: pointer; font-size: 14px; }
  .enviar:disabled { opacity: .5; cursor: default; }
  .rodape { font-size: 11px; color: #8a8a85; text-align: center; padding: 0 10px 8px; background: #fff; }
  @media (max-width: 480px) {
    .painel { right: 0; bottom: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .fab { transition: none; } .digitando i { animation: none; } }
</style>
<button class="fab" type="button" aria-label="Abrir chat de atendimento" aria-expanded="false">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
</button>
<section class="painel" role="dialog" aria-label="Chat de atendimento" hidden>
  <div class="topo"><div><strong></strong><small>Assistente virtual · responde na hora</small></div>
    <button class="fechar" type="button" aria-label="Fechar chat">×</button></div>
  <div class="msgs" aria-live="polite"></div>
  <form><input type="text" maxlength="1000" placeholder="Escreva sua mensagem" aria-label="Mensagem" autocomplete="off" required>
    <button class="enviar" type="submit">Enviar</button></form>
  <div class="rodape">Respostas geradas por IA. Não envie dados sensíveis.</div>
</section>`;

  const $ = (s) => root.querySelector(s);
  const fab = $('.fab'), painel = $('.painel'), msgs = $('.msgs'), form = $('form'), input = $('input'), enviarBtn = $('.enviar');
  $('.topo strong').textContent = TITULO;
  const aplicarCor = () => host.style.setProperty('--cor', corDoSite());
  aplicarCor();

  const add = (texto, tipo) => {
    const d = document.createElement('div');
    d.className = 'm ' + tipo;
    d.textContent = texto;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  };

  let iniciado = false;
  const abrir = (sim) => {
    aplicarCor(); // acompanha a cor caso o site tenha mudado (ex.: personalização)
    painel.hidden = !sim;
    fab.setAttribute('aria-expanded', String(sim));
    fab.setAttribute('aria-label', sim ? 'Fechar chat de atendimento' : 'Abrir chat de atendimento');
    if (sim) {
      if (!iniciado) { add(SAUDACAO, 'ia'); iniciado = true; }
      input.focus();
    } else {
      fab.focus();
    }
  };
  fab.addEventListener('click', () => abrir(painel.hidden));
  $('.fechar').addEventListener('click', () => abrir(false));
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painel.hidden) abrir(false); });

  let ocupado = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto || ocupado) return;
    ocupado = true; enviarBtn.disabled = true; input.value = '';
    add(texto, 'eu');
    const espera = add('', 'ia');
    espera.innerHTML = '<span class="digitando" aria-label="digitando"><i></i><i></i><i></i></span>';
    try {
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente: CLIENTE, session_id: sessao, message: texto }),
        signal: AbortSignal.timeout(90000),
      });
      if (r.status === 429) { espera.remove(); add('Muitas mensagens em pouco tempo. Aguarde um minuto e tente de novo.', 'aviso'); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      espera.textContent = data.reply || '';
      if (data.agendamento) add('Pedido registrado. A equipe confirma o horário com você.', 'aviso');
      else if (data.handoff) add('Sua conversa foi encaminhada para a equipe.', 'aviso');
    } catch (err) {
      espera.remove();
      add('O chat está indisponível no momento. Use o formulário de contato da página.', 'aviso');
    } finally {
      ocupado = false; enviarBtn.disabled = false; input.focus();
    }
  });

  const montar = () => document.body.appendChild(host);
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
})();
