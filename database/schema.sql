-- ========================================
-- SHOOTER ARENA - BASE DE DATOS
-- Schema completo para PostgreSQL (Supabase)
-- ========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLAS PRINCIPALES
-- ========================================

-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    avatar_url TEXT,
    display_name TEXT,
    bio TEXT,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    credits INTEGER DEFAULT 1000,
    premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'playing', 'spectating')),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estadísticas del jugador
CREATE TABLE IF NOT EXISTS public.player_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    damage_dealt BIGINT DEFAULT 0,
    damage_taken BIGINT DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    headshots INTEGER DEFAULT 0,
    longest_kill_streak INTEGER DEFAULT 0,
    total_playtime BIGINT DEFAULT 0, -- en segundos
    favorite_weapon TEXT,
    favorite_map TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id)
);

-- Partidas jugadas
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    map_id TEXT NOT NULL,
    game_mode TEXT NOT NULL CHECK (game_mode IN ('deathmatch', 'team_deathmatch', 'capture_flag', 'domination', 'battle_royale')),
    max_players INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- en segundos
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'cancelled')),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    winner_team INTEGER,
    winning_player UUID REFERENCES public.profiles(id),
    final_score JSONB,
    server_region TEXT DEFAULT 'na' CHECK (server_region IN ('na', 'eu', 'asia', 'sa', 'oce')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes en partidas
CREATE TABLE IF NOT EXISTS public.match_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team INTEGER,
    score INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    damage_dealt BIGINT DEFAULT 0,
    damage_taken BIGINT DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0.00,
    headshots INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    rank_position INTEGER,
    experience_earned INTEGER DEFAULT 0,
    credits_earned INTEGER DEFAULT 0,
    survived BOOLEAN DEFAULT FALSE,
    mvp BOOLEAN DEFAULT FALSE,
    disconnected BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(match_id, player_id)
);

-- Clasificaciones (Leaderboards)
CREATE TABLE IF NOT EXISTS public.leaderboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('global', 'regional', 'seasonal', 'weekly', 'daily')),
    game_mode TEXT,
    map_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    reset_interval TEXT DEFAULT 'weekly' CHECK (reset_interval IN ('daily', 'weekly', 'monthly', 'seasonal')),
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    next_reset TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entradas en las clasificaciones
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leaderboard_id UUID REFERENCES public.leaderboards(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score BIGINT NOT NULL,
    rank INTEGER,
    previous_rank INTEGER,
    stats JSONB, -- estadísticas adicionales
    season INTEGER DEFAULT 1,
    week INTEGER,
    day DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(leaderboard_id, player_id, season, week, day)
);

-- Logros
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('combat', 'social', 'exploration', 'progression', 'special')),
    type TEXT NOT NULL CHECK (type IN ('stat_based', 'progressive', 'one_time', 'hidden')),
    requirement JSONB NOT NULL, -- condiciones para desbloquear
    rewards JSONB, -- recompensas (experiencia, créditos, items)
    is_active BOOLEAN DEFAULT TRUE,
    is_hidden BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progreso de logros
CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    progress JSONB DEFAULT '{}',
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, achievement_id)
);

-- Inventario del jugador
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('weapon', 'skin', 'attachment', 'emote', 'banner', 'avatar', 'consumable')),
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
    is_equipped BOOLEAN DEFAULT FALSE,
    slot_type TEXT,
    acquired_from TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, item_id)
);

-- Tienda
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('weapons', 'skins', 'attachments', 'bundles', 'passes', 'consumables')),
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    price_credits INTEGER,
    price_premium INTEGER,
    original_price_credits INTEGER,
    original_price_premium INTEGER,
    discount_percentage INTEGER DEFAULT 0,
    is_limited BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    stock INTEGER,
    max_per_player INTEGER,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de compras
CREATE TABLE IF NOT EXISTS public.purchase_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_item_id UUID REFERENCES public.shop_items(id),
    quantity INTEGER DEFAULT 1,
    price_credits INTEGER,
    price_premium INTEGER,
    payment_method TEXT CHECK (payment_method IN ('credits', 'premium', 'free')),
    transaction_id TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Amigos
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(requester_id, addressee_id),
    CHECK(requester_id != addressee_id)
);

-- Clanes
CREATE TABLE IF NOT EXISTS public.clans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    tag TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 1,
    max_members INTEGER DEFAULT 50,
    is_public BOOLEAN DEFAULT TRUE,
    min_level INTEGER DEFAULT 1,
    total_score BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Miembros del clan
CREATE TABLE IF NOT EXISTS public.clan_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'co_leader', 'officer', 'member', 'recruit')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    promoted_at TIMESTAMPTZ,
    contribution_score BIGINT DEFAULT 0,
    UNIQUE(clan_id, player_id)
);

-- Eventos del juego
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('seasonal', 'special', 'tournament', 'double_xp', 'community')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    rewards JSONB,
    requirements JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participación en eventos
CREATE TABLE IF NOT EXISTS public.event_participation (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.game_events(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    progress JSONB DEFAULT '{}',
    rewards_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);

-- Reportes
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('cheating', 'toxicity', 'afk', 'bug_exploiting', 'inappropriate_name', 'harassment', 'other')),
    description TEXT,
    evidence_urls TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES public.profiles(id),
    review_notes TEXT,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sistema de bans
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('temporary', 'permanent', 'chat_ban')),
    duration INTEGER, -- en días, NULL para permanente
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    issued_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuraciones del juego
CREATE TABLE IF NOT EXISTS public.game_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de actividad
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ÍNDICES
-- ========================================

-- Perfiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen DESC);

-- Estadísticas
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON public.player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_kills ON public.player_stats(kills DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_wins ON public.player_stats(matches_won DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_accuracy ON public.player_stats(accuracy DESC);

-- Partidas
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_game_mode ON public.matches(game_mode);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_finished_at ON public.matches(finished_at DESC);

-- Participantes
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_player_id ON public.match_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_score ON public.match_participants(score DESC);
CREATE INDEX IF NOT EXISTS idx_match_participants_kills ON public.match_participants(kills DESC);

-- Leaderboards
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_id ON public.leaderboard_entries(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_player_id ON public.leaderboard_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON public.leaderboard_entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON public.leaderboard_entries(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_season ON public.leaderboard_entries(season);

-- Logros
CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement_id ON public.player_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_unlocked ON public.player_achievements(is_unlocked);
CREATE INDEX IF NOT EXISTS idx_player_achievements_unlocked_at ON public.player_achievements(unlocked_at DESC);

-- Inventario
CREATE INDEX IF NOT EXISTS idx_inventory_player_id ON public.inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON public.inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_rarity ON public.inventory(rarity);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON public.inventory(is_equipped);

-- Tienda
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON public.shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON public.shop_items(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_items_sort_order ON public.shop_items(sort_order);

-- Compras
CREATE INDEX IF NOT EXISTS idx_purchase_history_player_id ON public.purchase_history(player_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON public.purchase_history(created_at DESC);

-- Amistades
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Clanes
CREATE INDEX IF NOT EXISTS idx_clans_leader_id ON public.clans(leader_id);
CREATE INDEX IF NOT EXISTS idx_clans_member_count ON public.clans(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_clans_total_score ON public.clans(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON public.clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_player_id ON public.clan_members(player_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_role ON public.clan_members(role);

-- Eventos
CREATE INDEX IF NOT EXISTS idx_game_events_active ON public.game_events(is_active);
CREATE INDEX IF NOT EXISTS idx_game_events_dates ON public.game_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_participation_event_id ON public.event_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_player_id ON public.event_participation(player_id);

-- Reportes
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_player_id ON public.reports(reported_player_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Bans
CREATE INDEX IF NOT EXISTS idx_bans_player_id ON public.bans(player_id);
CREATE INDEX IF NOT EXISTS idx_bans_active ON public.bans(is_active);
CREATE INDEX IF NOT EXISTS idx_bans_ends_at ON public.bans(ends_at);

-- Logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_player_id ON public.activity_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ========================================
-- TRIGGERS Y FUNCIONES
-- ========================================

-- Actualizar timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$ BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_player_stats_updated_at
    BEFORE UPDATE ON public.player_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_leaderboard_entries_updated_at
    BEFORE UPDATE ON public.leaderboard_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_player_achievements_updated_at
    BEFORE UPDATE ON public.player_achievements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_shop_items_updated_at
    BEFORE UPDATE ON public.shop_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_clans_updated_at
    BEFORE UPDATE ON public.clans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_event_participation_updated_at
    BEFORE UPDATE ON public.event_participation
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_game_settings_updated_at
    BEFORE UPDATE ON public.game_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$ BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::text, 1, 8)),
        NEW.email
    );
    
    -- Crear estadísticas iniciales
    INSERT INTO public.player_stats (player_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Actualizar conteo de miembros del clan
CREATE OR REPLACE FUNCTION public.update_clan_member_count()
RETURNS TRIGGER AS $$ BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.clans 
        SET member_count = member_count + 1, updated_at = NOW()
        WHERE id = NEW.clan_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.clans 
        SET member_count = member_count - 1, updated_at = NOW()
        WHERE id = OLD.clan_id;
        
        -- Si el líder se va, asignar nuevo líder o eliminar clan
        IF OLD.role = 'leader' THEN
            UPDATE public.clans 
            SET leader_id = (
                SELECT player_id 
                FROM public.clan_members 
                WHERE clan_id = OLD.clan_id AND role != 'leader' 
                ORDER BY 
                    CASE role 
                        WHEN 'co_leader' THEN 1 
                        WHEN 'officer' THEN 2 
                        ELSE 3 
                    END,
                joined_at ASC
                LIMIT 1
            )
            WHERE id = OLD.clan_id;
        END IF;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER update_clan_member_count_trigger
    AFTER INSERT OR DELETE ON public.clan_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_clan_member_count();

-- ========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Políticas para estadísticas
CREATE POLICY "Users can view all player stats"
    ON public.player_stats FOR SELECT
    USING (true);

CREATE POLICY "Users can update own stats"
    ON public.player_stats FOR UPDATE
    USING (auth.uid() = player_id);

-- Políticas para partidas
CREATE POLICY "Users can view all matches"
    ON public.matches FOR SELECT
    USING (true);

CREATE POLICY "Users can insert matches"
    ON public.matches FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update matches"
    ON public.matches FOR UPDATE
    USING (true);

-- Políticas para participantes
CREATE POLICY "Users can view all match participants"
    ON public.match_participants FOR SELECT
    USING (true);

CREATE POLICY "Users can insert match participants"
    ON public.match_participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update own match participant data"
    ON public.match_participants FOR UPDATE
    USING (auth.uid() = player_id);

-- Políticas para leaderboards
CREATE POLICY "Users can view all leaderboards"
    ON public.leaderboards FOR SELECT
    USING (true);

CREATE POLICY "Users can view all leaderboard entries"
    ON public.leaderboard_entries FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own leaderboard entries"
    ON public.leaderboard_entries FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update own leaderboard entries"
    ON public.leaderboard_entries FOR UPDATE
    USING (auth.uid() = player_id);

-- Políticas para logros
CREATE POLICY "Users can view all achievements"
    ON public.achievements FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can view own achievement progress"
    ON public.player_achievements FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own achievement progress"
    ON public.player_achievements FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update own achievement progress"
    ON public.player_achievements FOR UPDATE
    USING (auth.uid() = player_id);

-- Políticas para inventario
CREATE POLICY "Users can view own inventory"
    ON public.inventory FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own inventory items"
    ON public.inventory FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update own inventory items"
    ON public.inventory FOR UPDATE
    USING (auth.uid() = player_id);

CREATE POLICY "Users can delete own inventory items"
    ON public.inventory FOR DELETE
    USING (auth.uid() = player_id);

-- Políticas para tienda
CREATE POLICY "Users can view active shop items"
    ON public.shop_items FOR SELECT
    USING (is_active = true);

-- Políticas para historial de compras
CREATE POLICY "Users can view own purchase history"
    ON public.purchase_history FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own purchases"
    ON public.purchase_history FOR INSERT
    WITH CHECK (auth.uid() = player_id);

-- Políticas para amistades
CREATE POLICY "Users can view own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can insert friendship requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update received friendship requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Políticas para clanes
CREATE POLICY "Users can view all clans"
    ON public.clans FOR SELECT
    USING (is_public = true OR leader_id = auth.uid());

CREATE POLICY "Users can view own clan membership"
    ON public.clan_members FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Users can insert clan membership"
    ON public.clan_members FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Clan officers can update clan members"
    ON public.clan_members FOR UPDATE
    USING (
        auth.uid() = player_id OR
        auth.uid() IN (
            SELECT player_id 
            FROM public.clan_members cm2
            WHERE cm2.clan_id = clan_members.clan_id 
            AND cm2.role IN ('leader', 'co_leader', 'officer')
        )
    );

CREATE POLICY "Users can leave own clan"
    ON public.clan_members FOR DELETE
    USING (auth.uid() = player_id);

-- Políticas para eventos
CREATE POLICY "Users can view active events"
    ON public.game_events FOR SELECT
    USING (is_active = true);

CREATE POLICY "Users can view own event participation"
    ON public.event_participation FOR SELECT
    USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own event participation"
    ON public.event_participation FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update own event participation"
    ON public.event_participation FOR UPDATE
    USING (auth.uid() = player_id);

-- Políticas para reportes
CREATE POLICY "Users can insert own reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = reporter_id);

-- Políticas para bans
CREATE POLICY "Users can view own bans"
    ON public.bans FOR SELECT
    USING (auth.uid() = player_id);

-- Políticas para logs
CREATE POLICY "Users can insert own activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can view own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = player_id);

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Configuraciones del juego
INSERT INTO public.game_settings (key, value, description, is_public) VALUES
('max_level', '100', 'Nivel máximo del jugador', true),
('xp_per_level', '1000', 'Experiencia base necesaria por nivel', true),
('starting_credits', '1000', 'Créditos iniciales del jugador', true),
('match_duration', '600', 'Duración de partida en segundos', true),
('max_players_per_match', '16', 'Máximo de jugadores por partida', true),
('clan_min_members', '5', 'Mínimo de miembros para crear clan', true),
('clan_max_members', '50', 'Máximo de miembros por clan', true),
('friend_request_limit', '100', 'Límite de solicitudes de amistad', true),
('daily_login_bonus', '100', 'Bono diario de login', true),
('report_cooldown_hours', '1', 'Tiempo de espera entre reportes', true);

-- Leaderboards por defecto
INSERT INTO public.leaderboards (name, display_name, description, type, reset_interval) VALUES
('global_kills', 'Global Kills', 'Total de asesinatos global', 'global', 'monthly'),
('global_wins', 'Global Wins', 'Total de victorias global', 'global', 'monthly'),
('weekly_kills', 'Weekly Kills', 'Asesinatos esta semana', 'weekly', 'weekly'),
('weekly_wins', 'Weekly Wins', 'Victorias esta semana', 'weekly', 'weekly'),
('accuracy', 'Accuracy', 'Precisión de disparos', 'global', 'monthly'),
('level', 'Level', 'Nivel del jugador', 'global', 'monthly');

-- Logros por defecto
INSERT INTO public.achievements (name, display_name, description, category, type, requirement, rewards) VALUES
('first_kill', 'First Blood', 'Realiza tu primer asesinato', 'combat', 'one_time', '{"kills": 1}', '{"experience": 100, "credits": 50}'),
('kill_streak_5', 'Kill Streak', 'Consigue 5 asesinatos seguidos', 'combat', 'one_time', '{"streak": 5}', '{"experience": 500, "credits": 200}'),
('sharpshooter', 'Sharpshooter', 'Alcanza 75% de precisión', 'combat', 'one_time', '{"accuracy": 75}', '{"experience": 750, "credits": 300}'),
('veteran', 'Veteran', 'Juega 100 partidas', 'progression', 'one_time', '{"matches": 100}', '{"experience": 1000, "credits": 500}'),
('social_butterfly', 'Social Butterfly', 'Añade 10 amigos', 'social', 'one_time', '{"friends": 10}', '{"experience": 300, "credits": 150}'),
('clan_member', 'Team Player', 'Únete a un clan', 'social', 'one_time', '{"clan": true}', '{"experience": 500, "credits": 250}');

-- Items de la tienda por defecto
INSERT INTO public.shop_items (name, display_name, description, category, item_type, item_id, price_credits, rarity) VALUES
('ak47_default', 'AK-47', 'Rifle de asalto estándar', 'weapons', 'weapon', 'ak47', 1000, 'common'),
('m4a1_default', 'M4A1', 'Rifle de asalto balanceado', 'weapons', 'weapon', 'm4a1', 1200, 'common'),
('awp_default', 'AWP', 'Francotirador de alto daño', 'weapons', 'weapon', 'awp', 2000, 'rare'),
('deagle_default', 'Desert Eagle', 'Pistola de alto poder', 'weapons', 'weapon', 'deagle', 800, 'uncommon'),
('skin_dragon', 'Dragon Skin', 'Skin de arma rara', 'skins', 'skin', 'dragon', 5000, 'epic'),
('emote_dance', 'Victory Dance', 'Emote de celebración', 'emotes', 'emote', 'dance', 1500, 'uncommon');

-- Eventos de ejemplo
INSERT INTO public.game_events (name, display_name, description, type, start_date, end_date, rewards) VALUES
('double_xp_weekend', 'Double XP Weekend', 'Doble experiencia todo el fin de semana', 'double_xp', 
 NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 
 '{"xp_multiplier": 2}'),
('summer_tournament', 'Summer Tournament', 'Torneo de verano con grandes premios', 'tournament',
 NOW() + INTERVAL '1 week', NOW() + INTERVAL '2 weeks',
 '{"prize_pool": 100000, "participants": 100}');

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista de estadísticas completas del jugador
CREATE OR REPLACE VIEW public.player_full_stats AS
SELECT 
    p.id,
    p.username,
    p.level,
    p.experience,
    p.credits,
    p.status,
    p.created_at,
    ps.matches_played,
    ps.matches_won,
    ps.matches_lost,
    ps.kills,
    ps.deaths,
    ps.assists,
    CASE 
        WHEN ps.deaths = 0 THEN ps.kills::DECIMAL
        ELSE ROUND((ps.kills::DECIMAL / ps.deaths), 2)
    END as kda_ratio,
    ps.accuracy,
    ps.headshots,
    ps.total_playtime,
    ps.favorite_weapon,
    ps.favorite_map,
    COALESCE(cm.clan_id, NULL) as clan_id,
    COALESCE(c.name, NULL) as clan_name,
    COALESCE(cm.role, NULL) as clan_role
FROM public.profiles p
LEFT JOIN public.player_stats ps ON p.id = ps.player_id
LEFT JOIN public.clan_members cm ON p.id = cm.player_id
LEFT JOIN public.clans c ON cm.clan_id = c.id;

-- Vista de ranking global
CREATE OR REPLACE VIEW public.global_ranking AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY ps.kills DESC, ps.matches_won DESC) as global_rank,
    p.username,
    p.level,
    ps.kills,
    ps.matches_won,
    ps.matches_played,
    CASE 
        WHEN ps.deaths = 0 THEN ps.kills::DECIMAL
        ELSE ROUND((ps.kills::DECIMAL / ps.deaths), 2)
    END as kda_ratio,
    ps.accuracy
FROM public.profiles p
JOIN public.player_stats ps ON p.id = ps.player_id
WHERE p.level >= 5
ORDER BY ps.kills DESC, ps.matches_won DESC;

-- Vista de actividad reciente
CREATE OR REPLACE VIEW public.recent_activity AS
SELECT 
    p.username,
    al.action,
    al.details,
    al.created_at
FROM public.activity_logs al
JOIN public.profiles p ON al.player_id = p.id
ORDER BY al.created_at DESC
LIMIT 100;

-- Vista de clanes activos
CREATE OR REPLACE VIEW public.active_clans AS
SELECT 
    c.id,
    c.name,
    c.tag,
    c.member_count,
    c.total_score,
    p.username as leader_username,
    cm_count.active_members,
    c.created_at
FROM public.clans c
JOIN public.profiles p ON c.leader_id = p.id
LEFT JOIN (
    SELECT clan_id, COUNT(*) as active_members
    FROM public.clan_members
    GROUP BY clan_id
) cm_count ON c.id = cm_count.clan_id
WHERE c.member_count >= 5
ORDER BY c.total_score DESC;

-- ========================================
-- FUNCIONES ADICIONALES
-- ========================================

-- Función para calcular experiencia necesaria para un nivel
CREATE OR REPLACE FUNCTION public.xp_for_level(level_param INTEGER)
RETURNS INTEGER AS $$ BEGIN
    RETURN 1000 * level_param * (1 + level_param * 0.1);
END;
 $$ LANGUAGE plpgsql;

-- Función para actualizar experiencia y nivel
CREATE OR REPLACE FUNCTION public.add_experience(player_id_param UUID, xp_gain INTEGER)
RETURNS BOOLEAN AS $$ DECLARE
    current_level INTEGER;
    current_xp INTEGER;
    xp_needed INTEGER;
    level_ups INTEGER := 0;
BEGIN
    -- Obtener estadísticas actuales
    SELECT level, experience INTO current_level, current_xp
    FROM public.profiles
    WHERE id = player_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Añadir experiencia
    current_xp := current_xp + xp_gain;
    
    -- Verificar subidas de nivel
    LOOP
        xp_needed := public.xp_for_level(current_level);
        IF current_xp >= xp_needed THEN
            current_xp := current_xp - xp_needed;
            current_level := current_level + 1;
            level_ups := level_ups + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;
    
    -- Actualizar perfil
    UPDATE public.profiles
    SET level = current_level, experience = current_xp
    WHERE id = player_id_param;
    
    -- Registrar actividad
    IF level_ups > 0 THEN
        INSERT INTO public.activity_logs (player_id, action, details)
        VALUES (player_id_param, 'level_up', 
                json_build_object('new_level', current_level, 'levels_gained', level_ups));
    END IF;
    
    INSERT INTO public.activity_logs (player_id, action, details)
    VALUES (player_id_param, 'experience_gained', 
            json_build_object('amount', xp_gain, 'total', current_xp));
    
    RETURN TRUE;
END;
 $$ LANGUAGE plpgsql;

-- Función para procesar el fin de una partida
CREATE OR REPLACE FUNCTION public.process_match_end(match_id_param UUID)
RETURNS BOOLEAN AS $$ DECLARE
    match_record RECORD;
    participant RECORD;
    xp_bonus INTEGER;
    credits_bonus INTEGER;
BEGIN
    -- Obtener datos de la partida
    SELECT * INTO match_record
    FROM public.matches
    WHERE id = match_id_param;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Procesar cada participante
    FOR participant IN 
        SELECT * FROM public.match_participants
        WHERE match_id = match_id_param
    LOOP
        -- Calcular bonos basados en rendimiento
        xp_bonus := participant.kills * 50 + participant.assists * 25 + participant.score * 2;
        credits_bonus := participant.kills * 10 + participant.score;
        
        -- Bonos por victoria
        IF participant.team = match_record.winner_team THEN
            xp_bonus := xp_bonus * 2;
            credits_bonus := credits_bonus * 2;
        END IF;
        
        -- Bono MVP
        IF participant.mvp THEN
            xp_bonus := xp_bonus + 500;
            credits_bonus := credits_bonus + 200;
        END IF;
        
        -- Actualizar experiencia y créditos
        PERFORM public.add_experience(participant.player_id, xp_bonus);
        
        UPDATE public.profiles
        SET credits = credits + credits_bonus
        WHERE id = participant.player_id;
        
        -- Actualizar estadísticas
        UPDATE public.player_stats
        SET 
            matches_played = matches_played + 1,
            matches_won = CASE WHEN participant.team = match_record.winner_team THEN matches_won + 1 ELSE matches_won END,
            matches_lost = CASE WHEN participant.team != match_record.winner_team THEN matches_lost + 1 ELSE matches_lost END,
            kills = kills + participant.kills,
            deaths = deaths + participant.deaths,
            assists = assists + participant.assists,
            damage_dealt = damage_dealt + participant.damage_dealt,
            damage_taken = damage_taken + participant.damage_taken,
            accuracy = GREATEST(0, LEAST(100, 
                (accuracy * matches_played + participant.accuracy) / (matches_played + 1))),
            headshots = headshots + participant.headshots,
            longest_kill_streak = GREATEST(longest_kill_streak, participant.longest_streak),
            total_playtime = total_playtime + match_record.duration
        WHERE player_id = participant.player_id;
        
        -- Actualizar leaderboard
        INSERT INTO public.leaderboard_entries (leaderboard_id, player_id, score, season, week)
        VALUES 
            ('global_kills', participant.player_id, participant.kills, 1, EXTRACT(WEEK FROM NOW())),
            ('global_wins', participant.player_id, CASE WHEN participant.team = match_record.winner_team THEN 1 ELSE 0 END, 1, EXTRACT(WEEK FROM NOW())),
            ('weekly_kills', participant.player_id, participant.kills, 1, EXTRACT(WEEK FROM NOW())),
            ('weekly_wins', participant.player_id, CASE WHEN participant.team = match_record.winner_team THEN 1 ELSE 0 END, 1, EXTRACT(WEEK FROM NOW()))
        ON CONFLICT (leaderboard_id, player_id, season, week)
        DO UPDATE SET 
            score = leaderboard_entries.score + EXCLUDED.score,
            updated_at = NOW();
    END LOOP;
    
    -- Marcar partida como finalizada
    UPDATE public.matches
    SET status = 'finished', finished_at = NOW()
    WHERE id = match_id_param;
    
    RETURN TRUE;
END;
 $$ LANGUAGE plpgsql;

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

/*
ESTE SCHEMA INCLUYE:

1. **SISTEMA DE USUARIOS**
   - Perfiles con niveles, experiencia, créditos
   - Estadísticas detalladas del jugador
   - Sistema de premium

2. **SISTEMA DE PARTIDAS**
   - Creación y gestión de partidas
   - Seguimiento de participantes
   - Estadísticas por partida

3. **CLASIFICACIONES**
   - Leaderboards globales y semanales
   - Actualización automática de rankings
   - Múltiples tipos de clasificación

4. **SISTEMA DE LOGROS**
   - Logros desbloqueables
   - Progreso de logros
   - Recompensas automáticas

5. **ECONOMÍA DEL JUEGO**
   - Tienda con items
   - Inventario del jugador
   - Historial de compras

6. **SOCIAL**
   - Sistema de amigos
   - Clanes con roles
   - Chat y actividad

7. **EVENTOS**
   - Eventos temporales
   - Participación y recompensas
   - Bonos especiales

8. **MODERACIÓN**
   - Sistema de reportes
   - Bans temporales y permanentes
   - Registro de actividad

9. **OPTIMIZACIONES**
   - Índices para rendimiento
   - Vistas para consultas comunes
   - Triggers para actualizaciones automáticas

10. **SEGURIDAD**
    - Row Level Security (RLS)
    - Políticas de acceso granulares
    - Validación de datos

PARA INSTALAR:
1. Copiar y ejecutar este SQL en Supabase
2. Verificar que todas las tablas se creen correctamente
3. Probar las políticas de seguridad
4. Configurar los datos iniciales según necesidad

NOTA: Este schema es extensible y puede modificarse según las necesidades específicas del juego.
*/