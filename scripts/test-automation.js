const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Configuración cargada via node --env-file=.env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

async function runTest() {
    console.log(`--- [TEST] Simulando Viernes 1 PM (Nueva lógica: Menores hits primero) ---`);

    // SIMULACIÓN: Forzamos que "Hoy" es Viernes 10 de Abril 2026
    const hoySimulado = new Date('2026-04-10T13:00:00');
    console.log(`Fecha simulada: ${hoySimulado.toLocaleString()}`);

    const fechaDomingoStr = '2026-04-12';
    const { data: etapa, error: etapaError } = await supabase
        .from('etapas')
        .select('*')
        .eq('fecha', fechaDomingoStr)
        .single();

    if (etapaError || !etapa) {
        console.log(`❌ Error database: no etapa ${fechaDomingoStr}`);
        return;
    }

    console.log(`✅ Torneo: ${etapa.nombre}`);

    // Jugadores inscritos (real o simulado)
    let { data: inscritos } = await supabase
        .from('inscripciones')
        .select('jugador:jugadores(nickname)')
        .eq('etapa_id', etapa.id)
        .eq('estado', 'pagada');

    let jugadoresArr = (inscritos && inscritos.length > 0) 
        ? inscritos.map(i => i.jugador.nickname).filter(n => n)
        : ['Pau JR', 'Jorge SB', 'Neymar', 'Messi', 'Pedri', 'Gavi', 'Lamine', 'Yamal', 'Mbappe', 'Haaland', 'Bellingham', 'Modric', 'Kroos', 'Vicent', 'Manolo', 'Pepe', 'Luis', 'Andres'];

    console.log(`Jugadores: ${jugadoresArr.length}`);

    const templatePath = path.resolve(__dirname, '../Excel_ImportHitsTournamentRound983_Export-2026-04-02 09_41_53.xlsx');
    const workbook = xlsx.readFile(templatePath);
    
    // Nueva lógica: Menores primero
    const distribution = calculateHitDistribution(jugadoresArr.length);
    console.log('Distribución (Menores primero):', distribution);

    // Aleatorizar
    const players = [...jugadoresArr].sort(() => Math.random() - 0.5);

    const hitData = [];
    const footgolferData = [];
    let playerIndex = 0;
    let currentStartTime = new Date(`${etapa.fecha}T14:00:00`);

    distribution.forEach((size, index) => {
        const hitNumber = index + 1;
        
        hitData.push({
            'Número de Hit': hitNumber,
            'Hoyo': 1,
            'Fecha de Salida \r\n DD/MM/YYYY': '12/04/2026',
            'Hora de Salida \r\n HH:mm': formatTimeHHmm(currentStartTime)
        });

        const hitPlayers = players.slice(playerIndex, playerIndex + size);
        const caliIdx = Math.floor(Math.random() * size);
        hitPlayers.forEach((p, pIdx) => {
            footgolferData.push({
                'Número de Hit': hitNumber,
                'Footgolfer': p,
                '¿Es Calificador? \r\n 1=Sí \r\n 0=No': (pIdx === caliIdx ? 1 : 0)
            });
        });
        playerIndex += size;
        currentStartTime.setMinutes(currentStartTime.getMinutes() + 7);
    });

    workbook.Sheets['HITS'] = xlsx.utils.json_to_sheet(hitData);
    workbook.Sheets['FOOTGOLFERS'] = xlsx.utils.json_to_sheet(footgolferData);

    const outputFileName = `TEST_FINAL_Hits_2026-04-12.xlsx`;
    const outputPath = path.resolve(__dirname, `../${outputFileName}`);
    xlsx.writeFile(workbook, outputPath);
    console.log(`✅ Excel generado: ${outputFileName}`);

    // ENVÍO DE EMAIL REAL (Resend)
    console.log('Intentando envío real de email a pjuanramon@hotmail.com...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['pjuanramon@hotmail.com'],
            subject: `[TEST] Hits Footgolf – Nueva Lógica`,
            html: `<p>Hola, esta es una prueba usando el email de test de Resend ya que el dominio <b>footgolfcatalunya.com</b> no está verificado aún.</p>`,
            attachments: [{ filename: outputFileName, content: fs.readFileSync(outputPath) }]
        });
        if (error) console.error('❌ Error de Resend:', error);
        else console.log('✅ Email enviado con ID:', data.id);
    } catch (e) {
        console.error('❌ Excepción al enviar email:', e.message);
    }

    console.log('--- TEST FINALIZADO ---');
}

function calculateHitDistribution(n) {
    if (n === 0) return [];
    let bestDist = null;
    let minThrees = Infinity;
    for (let z = 0; z <= 2; z++) {
        for (let y = 0; y <= Math.floor(n / 4); y++) {
            let remaining = n - (z * 3) - (y * 4);
            if (remaining >= 0 && remaining % 5 === 0) {
                let x = remaining / 5;
                if (z < minThrees) {
                    minThrees = z;
                    let currentDist = [];
                    for(let i=0; i<x; i++) currentDist.push(5);
                    for(let i=0; i<y; i++) currentDist.push(4);
                    for(let i=0; i<z; i++) currentDist.push(3);
                    bestDist = currentDist;
                }
            }
        }
    }
    return bestDist ? bestDist.sort((a, b) => a - b) : [n];
}

function formatTimeHHmm(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

runTest().catch(console.error);
