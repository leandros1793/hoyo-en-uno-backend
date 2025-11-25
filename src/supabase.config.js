// ============================================
// SUPABASE CONFIGURATION - HOYO EN UNO
// Backend connection to Supabase
// ============================================

const { createClient } = require('@supabase/supabase-js');

// ============================================
// CREDENCIALES DE SUPABASE
// ============================================

// Leer desde variables de entorno (RECOMENDADO)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uukfxhdnnjjfjsilglov.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a2Z4aGRubmpqZmpzaWxnbG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDczODQsImV4cCI6MjA3NzQ4MzM4NH0.m_ESoiJsHBE_cZv6ByfGPuEWmCgIiTZOgeI7SLAfB5I';

// ============================================
// VALIDACIÓN
// ============================================

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Credenciales de Supabase no configuradas');
    console.error('Configura SUPABASE_URL y SUPABASE_KEY en tus variables de entorno');
    process.exit(1);
}

// ============================================
// CREAR CLIENTE
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false // No necesitamos sesiones en el backend
    }
});

// ============================================
// VERIFICACIÓN DE CONEXIÓN
// ============================================

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        console.log('╔════════════════════════════════════════╗');
        console.log('║      SUPABASE - HOYO EN UNO           ║');
        console.log('╠════════════════════════════════════════╣');
        console.log('║ ✅ Conexión exitosa                    ║');
        console.log(`║ 🔗 URL: ${SUPABASE_URL.substring(0, 30).padEnd(30)}║`);
        console.log('╚════════════════════════════════════════╝');
        
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con Supabase:', error.message);
        return false;
    }
}

// Ejecutar test de conexión al importar
testConnection();

// ============================================
// EXPORTAR
// ============================================

module.exports = supabase;