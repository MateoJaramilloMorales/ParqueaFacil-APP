const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcrypt'); // 🛡️ Sistema de seguridad para contraseñas
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE SUPABASE ---
const SB_URL = 'https://bnjmejydokzxkqpfqeea.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY; 
const supabase = createClient(SB_URL, SB_KEY);

const SALT_ROUNDS = 10; // Fuerza de encriptación para bcrypt

// ==========================================
// --- MÉTODOS GET (Consultas) --------------
// ==========================================

// Ruta principal de control
app.get('/', (req, res) => {
    res.send('🚀 Servidor de ParqueaFácil Medellín - ACTIVO');
});

// Obtener todos los parqueaderos operativos
app.get('/parqueaderos', async (req, res) => {
    const { data, error } = await supabase.from('parqueaderos').select('*');
    if (error) return res.status(400).json(error);
    res.json(data);
});

// INDEPENDENCIA TOTAL: Obtener la reserva activa exclusiva de un conductor (Mateo vs Marcos)
app.get('/reserva-activa/:email', async (req, res) => {
    const { email } = req.params;
    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('usuario_email', email.trim().toLowerCase())
        .eq('estado', 'activa') 
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) return res.status(400).json(error);
    res.json(data); // Si no tiene, devuelve null y el frontend limpia la pantalla de forma automática
});

// Historial general de reservas (Solo para Super-Admin de la App)
app.get('/historial-reservas', async (req, res) => {
    try {
        const { data: reservas, error: resError } = await supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });

        if (resError) throw resError;

        const { data: parqueaderos, error: pError } = await supabase
            .from('parqueaderos')
            .select('id, nombre');

        if (pError) throw pError;

        const historialCombinado = reservas.map(reserva => {
            const parqueaderoAsociado = parqueaderos.find(p => p.id === reserva.parqueadero_id);
            return {
                ...reserva,
                parqueaderos: {
                    nombre: parqueaderoAsociado ? parqueaderoAsociado.nombre : 'Parqueadero Desconocido'
                }
            };
        });

        res.json(historialCombinado);
    } catch (e) {
        console.error("❌ Error al obtener historial general:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// INDEPENDENCIA TOTAL: Historial aislado de un solo cliente (Filtra de forma estricta por Email)
app.get('/historial-reservas-cliente/:email', async (req, res) => {
    const { email } = req.params;
    try {
        const { data: reservas, error: resError } = await supabase
            .from('reservas')
            .select('*')
            .eq('usuario_email', email.trim().toLowerCase())
            .order('created_at', { ascending: false });

        if (resError) throw resError;

        const { data: parqueaderos, error: pError } = await supabase
            .from('parqueaderos')
            .select('id, nombre');

        if (pError) throw pError;

        const historialCliente = reservas.map(reserva => {
            const parqueaderoAsociado = parqueaderos.find(p => p.id === reserva.parqueadero_id);
            return {
                ...reserva,
                parqueaderos: {
                    nombre: parqueaderoAsociado ? parqueaderoAsociado.nombre : 'Parqueadero Desconocido'
                }
            };
        });

        res.json(historialCliente); // Devuelve array vacío [] si el usuario está nuevo
    } catch (e) {
        console.error("❌ Error al obtener historial del cliente:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// MÉTRICAS INDEPENDIENTES: Dashboard exclusivo para el dueño del parqueadero
app.get('/admin/metricas/:parqueadero_id', async (req, res) => {
    const { parqueadero_id } = req.params;
    try {
        // 1. Obtener info de celdas del parqueadero
        const { data: p, error: pError } = await supabase.from('parqueaderos').select('cupos_totales, cupos_disponibles').eq('id', parqueadero_id).single();
        if (pError || !p) return res.status(404).json({ error: "Parqueadero no encontrado" });

        // 2. Obtener la suma monetaria de reservas completadas de este parqueadero
        const { data: reservas, error: rError } = await supabase.from('reservas').select('total_pago').eq('parqueadero_id', parqueadero_id).eq('estado', 'completada');
        if (rError) throw rError;

        const ingresosTotales = reservas.reduce((sum, res) => sum + (res.total_pago || 0), 0);
        const celdasOcupadas = p.cupos_totales - p.cupos_disponibles;
        const porcentajeOcupacion = p.cupos_totales > 0 ? Math.round((celdasOcupadas / p.cupos_totales) * 100) : 0;

        res.json({
            ingresos_totales: ingresosTotales,
            ocupacion_actual: `${porcentajeOcupacion}%`,
            cupos_disponibles: p.cupos_disponibles
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ==========================================
// --- MÉTODOS POST (Creaciones y Acciones) -
// ==========================================

// Autenticación: Login Seguro con Bcrypt
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const correoLimpio = email.trim().toLowerCase();
    
    // Buscamos al usuario únicamente por su correo
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', correoLimpio)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!usuario) return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    // 🛡️ Comparamos de forma segura el hash de la base de datos con la contraseña enviada
    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecto) return res.status(401).json({ error: "Correo o contraseña incorrectos" });

    // Devolvemos los datos limpios sin comprometer la seguridad
    const { password: _, ...usuarioSeguro } = usuario;
    res.json(usuarioSeguro);
});

// Autenticación: Registro con hasheo de contraseñas de seguridad
app.post('/registro', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    
    try {
        // Encriptar la clave antes de enviarla a Supabase
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ 
                nombre, 
                email: email.trim().toLowerCase(), 
                password: hashedPassword, // Guardamos el hash seguro
                rol 
            }])
            .select();

        if (error) return res.status(400).json(error);
        res.status(201).json(data);
    } catch (e) {
        res.status(500).json({ error: "Error en el proceso de registro" });
    }
});

// Registrar un nuevo parqueadero
app.post('/parqueaderos', async (req, res) => {
    const { nombre, direccion, cupos_totales, cupos_disponibles, lat, lng, precio, metodo_pago, fotos } = req.body;
    
    const { data, error } = await supabase
        .from('parqueaderos')
        .insert([{ 
            nombre, direccion, cupos_totales, cupos_disponibles, lat, lng,
            precio: parseFloat(precio), metodo_pago, fotos 
        }])
        .select();

    if (error) return res.status(400).json(error);
    res.status(201).json(data);
});

// Lógica de reservas (U Unificada con validaciones de tipo de vehículo en Supabase)
app.post('/reservar-cupo', async (req, res) => {
    const { id, cantidad, tiempoHoras, tipo, usuario_email, usuario_nombre, metodo } = req.body;
    
    console.log("📥 Intento de reserva recibida:", { usuario_nombre, usuario_email, parqueadero_id: id });
    const TIEMPO_MS = tiempoHoras * 60 * 60 * 1000;

    try {
        const { data: p, error: pError } = await supabase.from('parqueaderos').select('*').eq('id', id).single();
        
        if (pError || !p) {
            console.error("❌ Error: Parqueadero no encontrado");
            return res.status(404).json({ error: "Parqueadero no encontrado" });
        }

        if (p.tipo_vehiculo && p.tipo_vehiculo !== 'ambos') {
            if (p.tipo_vehiculo !== tipo) {
                return res.status(400).json({ 
                    error: `Este parqueadero está registrado para: Solo ${p.tipo_vehiculo}s.` 
                });
            }
        }

        if (p.cupos_disponibles < cantidad) {
            console.warn("⚠️ Cupos insuficientes solicitados");
            return res.status(400).json({ error: "Cupos insuficientes" });
        }

        const totalCalculado = Math.round(p.precio * (tipo === 'moto' ? 0.5 : 1.0) * cantidad * tiempoHoras);
        
        const { data: resData, error: resError } = await supabase.from('reservas').insert([{
            parqueadero_id: id, 
            usuario_email: usuario_email ? usuario_email.trim().toLowerCase() : 'sin@email.com', 
            usuario_nombre: usuario_nombre || 'Usuario Desconocido',
            vehiculo_tipo: tipo,
            cantidad_celdas: cantidad, 
            horas_reservadas: tiempoHoras,
            total_pago: totalCalculado, 
            metodo_pago: metodo, 
            estado: 'activa'
        }]).select();

        if (resError) {
            console.error("❌ Error Supabase al insertar reserva:", resError.message);
            return res.status(400).json({ error: resError.message });
        }

        await supabase.from('parqueaderos')
            .update({ cupos_disponibles: p.cupos_disponibles - cantidad })
            .eq('id', id);

        setTimeout(async () => {
            const { data: pCheck } = await supabase.from('parqueaderos').select('cupos_disponibles').eq('id', id).single();
            if (pCheck) {
                await supabase.from('parqueaderos').update({ cupos_disponibles: pCheck.cupos_disponibles + cantidad }).eq('id', id);
                console.log(`⏰ Cupos liberados automáticamente para parqueadero ID: ${id}`);
            }
        }, TIEMPO_MS);

        console.log("✅ Reserva procesada exitosamente");
        res.json({ success: true, data: resData });

    } catch (e) {
        console.error("💥 Error crítico en el servidor:", e.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Cancelar o borrar reserva (Admin - Libera cupos automáticamente)
app.post('/cancelar-reserva/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: reserva, error: rError } = await supabase
            .from('reservas')
            .select('parqueadero_id, cantidad_celdas, estado')
            .eq('id', id)
            .single();

        if (rError || !reserva) return res.status(404).json({ error: "Reserva no encontrada" });

        if (reserva.estado !== 'activa') {
            await supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', id);
            return res.json({ success: true });
        }

        await supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', id);

        const { data: p } = await supabase
            .from('parqueaderos')
            .select('cupos_disponibles')
            .eq('id', reserva.parqueadero_id)
            .single();

        if (p) {
            await supabase.from('parqueaderos')
                .update({ cupos_disponibles: p.cupos_disponibles + reserva.cantidad_celdas })
                .eq('id', reserva.parqueadero_id);
        }

        console.log(`🛑 Reserva ID ${id} cancelada y cupos devueltos.`);
        res.json({ success: true });

    } catch (e) {
        console.error("❌ Error al cancelar reserva:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Liberar cupo manual (Botón de finalizar de forma explícita)
app.post('/liberar-cupo', async (req, res) => {
    const { id, cantidad } = req.body;
    const { data: p } = await supabase.from('parqueaderos').select('cupos_disponibles').eq('id', id).single();
    if (p) {
        await supabase.from('parqueaderos').update({ cupos_disponibles: p.cupos_disponibles + cantidad }).eq('id', id);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "No encontrado" });
    }
});


// ==========================================
// --- MÉTODOS PUT (Actualizaciones) --------
// ==========================================

// Gestión de perfiles de usuario
app.put('/usuarios/:email', async (req, res) => {
    const { email } = req.params;
    const { nombre, password } = req.body;
    
    let updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (password) {
        updateData.password = await bcrypt.hash(password, SALT_ROUNDS); // Re-hashear clave si se edita
    }

    const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('email', email.trim().toLowerCase());

    if (error) return res.status(400).json(error);
    res.json({ success: true });
});

// Modificar tiempo de una reserva (Admin)
app.put('/modificar-reserva/:id', async (req, res) => {
    const { id } = req.params;
    const { horas_reservadas, total_pago } = req.body;

    try {
        const { data, error = null } = await supabase
            .from('reservas')
            .update({ 
                horas_reservadas: parseInt(horas_reservadas), 
                total_pago: Math.round(total_pago) 
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        console.log(`✏️ Reserva ID ${id} modificada por el Admin.`);
        res.json({ success: true, data });
    } catch (e) {
        console.error("❌ Error al modificar reserva:", e.message);
        res.status(400).json({ error: e.message });
    }
});

// Actualizar el estado operativo del parqueadero (abierto/cerrado)
app.put('/parqueaderos/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado_operacion } = req.body;

    const { error } = await supabase
        .from('parqueaderos')
        .update({ estado_operacion })
        .eq('id', id);

    if (error) {
        return res.status(500).json({ error: "No se pudo actualizar el estado" });
    }
    res.json({ success: true, message: "Estado actualizado con éxito" });
});


// ==========================================
// --- MÉTODOS DELETE (Eliminaciones) -------
// ==========================================

// Eliminar un usuario
app.delete('/usuarios/:email', async (req, res) => {
    const { email } = req.params;
    const { error } = await supabase.from('usuarios').delete().eq('email', email.trim().toLowerCase());
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true });
});

// Eliminar un parqueadero
app.delete('/parqueaderos/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('parqueaderos').delete().eq('id', id);
    if (error) return res.status(400).json(error);
    res.json({ success: true });
});


// --- INICIALIZACIÓN DEL ENTORNO ---
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ SERVIDOR UNIFICADO Y BLINDADO EN: http://192.168.1.70:${PORT}`);
});