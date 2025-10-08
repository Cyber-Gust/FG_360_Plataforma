-- ============================================
-- BANCO DE DADOS DE LOGÍSTICA (FG 360)
-- ============================================

-- EXTENSÕES NECESSÁRIAS
create extension if not exists "pgcrypto";

-- ===========================
-- CLIENTES
-- ===========================
create table if not exists clientes (
    id uuid primary key default gen_random_uuid(),
    nome_completo text not null,
    email text unique,
    telefone text,
    empresa text,
    criado_em timestamp with time zone default now()
);

-- ===========================
-- MOTORISTAS
-- ===========================
create table if not exists motoristas (
    id uuid primary key default gen_random_uuid(),
    nome_completo text not null,
    telefone text,
    cnh text unique,
    criado_em timestamp with time zone default now()
);

-- ===========================
-- VEÍCULOS
-- ===========================
create table if not exists veiculos (
    id uuid primary key default gen_random_uuid(),
    modelo text not null,
    placa text unique not null,
    tipo text,
    ano text,
    criado_em timestamp with time zone default now()
);

-- ===========================
-- PACOTES
-- ===========================
create table if not exists pacotes (
    id uuid primary key default gen_random_uuid(),
    codigo_rastreio text unique not null,
    descricao text,
    status text check (
        status in (
            'Pedido Criado',
            'Aguardando Coleta',
            'Coletado',
            'Em Transito',
            'Entregue',
            'Cancelado'
        )
    ) default 'Pedido Criado',
    cliente_id uuid references clientes(id) on delete set null,
    motorista_id uuid references motoristas(id) on delete set null,
    veiculo_id uuid references veiculos(id) on delete set null,
    origem text,
    destino_endereco text,
    prova_entrega_url text,
    criado_em timestamp with time zone default now(),
    atualizado_em timestamp with time zone default now()
);

-- ============================================
-- HABILITAR RLS (Row Level Security)
-- ============================================
alter table clientes enable row level security;
alter table motoristas enable row level security;
alter table veiculos enable row level security;
alter table pacotes enable row level security;

-- ============================================
-- POLÍTICAS DE ACESSO
-- ============================================

-- Todos os usuários autenticados podem visualizar os dados
create policy "Todos usuários autenticados podem ler clientes"
on clientes for select
using (auth.role() = 'authenticated');

create policy "Todos usuários autenticados podem ler motoristas"
on motoristas for select
using (auth.role() = 'authenticated');

create policy "Todos usuários autenticados podem ler veiculos"
on veiculos for select
using (auth.role() = 'authenticated');

create policy "Todos usuários autenticados podem ler pacotes"
on pacotes for select
using (auth.role() = 'authenticated');

-- Apenas autenticados podem inserir
create policy "Usuários autenticados podem criar clientes"
on clientes for insert
with check (auth.role() = 'authenticated');

create policy "Usuários autenticados podem criar motoristas"
on motoristas for insert
with check (auth.role() = 'authenticated');

create policy "Usuários autenticados podem criar veiculos"
on veiculos for insert
with check (auth.role() = 'authenticated');

create policy "Usuários autenticados podem criar pacotes"
on pacotes for insert
with check (auth.role() = 'authenticated');

-- Apenas autenticados podem atualizar
create policy "Usuários autenticados podem atualizar pacotes"
on pacotes for update
using (auth.role() = 'authenticated');

-- Apenas autenticados podem deletar
create policy "Usuários autenticados podem deletar pacotes"
on pacotes for delete
using (auth.role() = 'authenticated');

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp
before update on pacotes
for each row
execute function set_updated_at();

-- ============================================
-- 1. MOVIMENTAÇÕES FINANCEIRAS (Nova Tabela)
-- ============================================
create table if not exists movimentacoes_financeiras (
    id uuid primary key default gen_random_uuid(),
    
    -- Relacionamentos (Chaves Estrangeiras - podem ser nulas)
    pacote_id uuid references pacotes(id) on delete set null,
    cliente_id uuid references clientes(id) on delete set null,
    motorista_id uuid references motoristas(id) on delete set null,
    veiculo_id uuid references veiculos(id) on delete set null,
    
    -- Dados Financeiros (Todos os valores podem ser nulos, mas use NOT NULL para data)
    valor_pedido numeric(10, 2),        -- Receita Bruta (Valor que o cliente pagou)
    custo_motorista numeric(10, 2),     -- Custo com o Motorista (Comissão/Pagamento)
    custo_veiculo numeric(10, 2),       -- Custo com o Veículo (Combustível, Pedágio, Manutenção)

    -- Campos de Auditoria e Filtro
    data_lancamento date not null default current_date, -- Data usada para filtros de período
    observacoes text,
    criado_em timestamp with time zone default now()
);

-- Habilitar RLS e Criar Políticas de Acesso
alter table movimentacoes_financeiras enable row level security;

-- POLÍTICAS: Acesso Total (CRUD) para usuários autenticados
create policy "Usuários autenticados podem ler movimentacoes"
on movimentacoes_financeiras for select
using (auth.role() = 'authenticated');

create policy "Usuários autenticados podem criar movimentacoes"
on movimentacoes_financeiras for insert
with check (auth.role() = 'authenticated');

create policy "Usuários autenticados podem atualizar movimentacoes"
on movimentacoes_financeiras for update
using (auth.role() = 'authenticated');

create policy "Usuários autenticados podem deletar movimentacoes"
on movimentacoes_financeiras for delete
using (auth.role() = 'authenticated');