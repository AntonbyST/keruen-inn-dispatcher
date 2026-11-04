-- 14: несколько файлов к счёту. Первый файл остаётся в inv_file/inv_name, остальные — в inv_files: [{"path":"payments/<id>/<имя>","name":"исходное имя"}]
alter table public.payments add column if not exists inv_files jsonb not null default '[]'::jsonb;
notify pgrst, 'reload schema';
