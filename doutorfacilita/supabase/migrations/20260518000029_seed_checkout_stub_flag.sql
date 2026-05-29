-- 029 — Feature flag: checkout_stub_payment
--
-- Habilita o stub de pagamento em /checkout (cria a consulta e marca
-- status='in_queue' + paid_at=now() + payment_id='STUB-<uuid>'). Idempotente.
--
-- ⚠️ DESLIGAR EM PRODUÇÃO. Substituir por integração real (MercadoPago).
-- A trocar: src/app/checkout/actions.ts → confirmarPagamento(consultationId).

INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
  'checkout_stub_payment',
  true,
  'DEV: marca a consulta como paga sem gateway real. Desligar em prod.'
)
ON CONFLICT (key) DO NOTHING;
