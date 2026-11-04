-- v0.0.11: причина паузы / вопрос по счёту
alter table public.payments add column if not exists pause_note text, add column if not exists pause_by text;
comment on column public.payments.pause_note is 'Причина паузы / вопрос по счёту';
