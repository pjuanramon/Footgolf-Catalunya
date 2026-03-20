const { supabase } = require('../lib/supabase');

const updates = [
    {
        id: '3d54abc8-8b66-4e5a-a3a4-84d728639250',
        name: 'Giacomo Menghini',
        data: {
            fecha_nacimiento: '1979-09-06',
            anio_licencia: 2024
        }
    },
    {
        id: '01a0172e-336c-4824-9dfc-2ec64e1d7fbe',
        name: 'Jorge Buqueras',
        data: {
            anio_licencia: 2022
        }
    },
    {
        id: '56d542c7-f584-486d-ab15-189f76d4983b',
        name: 'Marc Company',
        data: {
            anio_licencia: 2025
        }
    },
    {
        id: 'b8e4acb3-6e3e-469b-8919-2f2f45cc235d',
        name: 'Alberto Leiva Cañada',
        data: {
            anio_licencia: 2025
        }
    }
];

async function runUpdates() {
    console.log('Starting player updates...');
    for (const item of updates) {
        console.log(`Updating ${item.name} (${item.id})...`);
        const { error } = await supabase
            .from('jugadores')
            .update(item.data)
            .eq('id', item.id);
            
        if (error) {
            console.error(`Error updating ${item.name}:`, error.message);
        } else {
            console.log(`Successfully updated ${item.name}.`);
        }
    }
    console.log('Finished updates.');
}

runUpdates().catch(err => console.error(err));
