import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Alert, TextInput, Dimensions, Modal, Keyboard, StatusBar, ScrollView, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

interface Parqueadero {
  id: number;
  nombre: string;
  lat: number | string;
  lng: number | string;
  cupos_disponibles: number;
  precio: number;
  metodo_pago: string; 
  tipo_vehiculo?: 'carro' | 'moto' | 'ambos';
}

interface Reserva {
  id: number;
  created_at: string;
  vehiculo_tipo: string;
  cantidad_celdas: number;
  horas_reservadas: number;
  total_pago: number;
  metodo_pago: string;
  estado: string;
  parqueaderos?: {
    nombre: string;
    direccion: string;
  };
}

export default function UserPanel() {
  const router = useRouter();
  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([]);
  const [filteredP, setFilteredP] = useState<Parqueadero[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [userData, setUserData] = useState({ nombre: 'Cargando...', email: '' });
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false); 
  const [tempNombre, setTempNombre] = useState('');
  const [tempPass, setTempPass] = useState('');
  
  const [tarjeta, setTarjeta] = useState<{numero: string, banco: string} | null>(null);
  const [numTarjetaInput, setNumTarjetaInput] = useState('');
  const [bancoTarjetaInput, setBancoTarjetaInput] = useState('');

  const [selectedP, setSelectedP] = useState<Parqueadero | null>(null);
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto'>('carro');
  const [cantidad, setCantidad] = useState(1);
  const [horas, setHoras] = useState(1); 
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'efectivo' | 'pse'>('tarjeta');
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);

  const [showTicket, setShowTicket] = useState(false);
  const [codigoReserva, setCodigoReserva] = useState('');
  const [timeLeft, setTimeLeft] = useState(0); 
  const [idReservaActiva, setIdReservaActiva] = useState<number | null>(null);

  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<Reserva[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [isMinimized, setIsMinimized] = useState(false);

  const inicializarSesion = async () => {
    try {
      const emailGuardado = await SecureStore.getItemAsync('usuario_email');
      const nombreGuardado = await SecureStore.getItemAsync('usuario_nombre');

      if (emailGuardado && nombreGuardado) {
        setUserData({ nombre: nombreGuardado, email: emailGuardado });
        setTempNombre(nombreGuardado);
        recuperarEstadoReserva(emailGuardado);
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.log("Error leyendo credenciales seguras", error);
      router.replace('/');
    }
  };

  const recuperarEstadoReserva = async (emailUsuario: string) => {
    try {
      const res = await axios.get(`http://192.168.1.70:3001/reserva-activa/${emailUsuario}`);
      
      if (res.data && res.data.success !== false) {
        const reserva = res.data;
        const ahora = new Date().getTime();
        const creado = new Date(reserva.created_at).getTime();
        const duracionMs = reserva.horas_reservadas * 3600 * 1000;
        const transcurrido = ahora - creado;
        const restanteSegundos = Math.floor((duracionMs - transcurrido) / 1000);

        if (restanteSegundos > 0) {
          setTimeLeft(restanteSegundos);
          setCodigoReserva("ACTIVA"); 
          setIdReservaActiva(reserva.parqueadero_id);
        }
      }
    } catch (e) {
      console.log("ℹ️ No hay reservas previas para restaurar.");
    }
  };

  useEffect(() => {
    if (timeLeft <= 0) {
        if (timeLeft === 0 && codigoReserva !== '') {
            liberarCeldaServidor();
            Alert.alert("Tiempo Agotado", "Tu reserva ha finalizado y el cupo se ha liberado.");
            setCodigoReserva('');
        }
        return;
    }
    const intervalId = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const liberarCeldaServidor = async () => {
    try {
        await axios.post('http://192.168.1.70:3001/liberar-cupo', { id: idReservaActiva, cantidad });
        cargarDatos(); 
    } catch (e) { console.log("Error al liberar cupo"); }
  };

  // 🔄 CARGA DE DATOS OPTIMIZADA: Sincroniza la hoja abierta de forma silenciosa
  const cargarDatos = async () => {
    try {
      const res = await axios.get('http://192.168.1.70:3001/parqueaderos');
      setParqueaderos(res.data);
      setFilteredP(res.data);

      // Si Mateo tiene la hoja abierta, le actualizamos los cupos disponibles en vivo
      if (selectedP) {
        const actualizado = res.data.find((p: Parqueadero) => p.id === selectedP.id);
        if (actualizado) {
          setSelectedP(actualizado);
        }
      }
    } catch (e) { 
      console.log("Error en sincronización silenciosa de fondo"); 
    } finally { 
      setLoading(false); 
    }
  };

  const cargarHistorialCliente = async () => {
    setLoadingHistorial(true);
    try {
      const res = await axios.get(`http://192.168.1.70:3001/historial-reservas-cliente/${userData.email}`);
      setHistorial(res.data);
    } catch (e) {
      Alert.alert("Error", "No pudimos obtener tus reservas en este momento.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  // 🔄 POLLING DE REAL-TIME: Pregunta al servidor por cambios cada 5 segundos
  useEffect(() => { 
    inicializarSesion();
    cargarDatos(); 

    const intervalSincronizacion = setInterval(() => {
      cargarDatos();
    }, 5000); 

    return () => clearInterval(intervalSincronizacion);
  }, []);

  const handleRegisterCard = () => {
    if (numTarjetaInput.length < 16) return Alert.alert("Error", "Número de tarjeta inválido");
    setTarjeta({ numero: numTarjetaInput.slice(-4), banco: bancoTarjetaInput });
    setShowAddCard(false);
    setNumTarjetaInput('');
    setBancoTarjetaInput('');
    Alert.alert("Éxito", "Tarjeta vinculada correctamente ✅");
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`http://192.168.1.70:3001/usuarios/${userData.email}`, { nombre: tempNombre });
      setUserData({ ...userData, nombre: tempNombre });
      await SecureStore.setItemAsync('usuario_nombre', tempNombre);
      setShowEdit(false);
      Alert.alert("Éxito", "Perfil actualizado ✅");
    } catch (e) { Alert.alert("Error", "No se pudo actualizar."); }
  };

  const handleChangePassword = async () => {
    if (tempPass.length < 4) return Alert.alert("Error", "Mínimo 4 caracteres.");
    try {
      await axios.put(`http://192.168.1.70:3001/usuarios/${userData.email}`, { password: tempPass });
      setTempPass('');
      setShowSecurity(false);
      Alert.alert("Éxito", "Contraseña cambiada ✅");
    } catch (e) { Alert.alert("Error", "No se pudo cambiar."); }
  };

  const handleDeleteAccount = () => {
    Alert.alert("⚠️ ELIMINAR CUENTA", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "ELIMINAR", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`http://192.168.1.70:3001/usuarios/${userData.email}`);
            await SecureStore.deleteItemAsync('usuario_email');
            await SecureStore.deleteItemAsync('usuario_nombre');
            router.replace('/');
          } catch (e) { Alert.alert("Error", "Fallo al eliminar."); }
      }}
    ]);
  };

  const handleProcessPayment = async () => {
    if (!selectedP) return;
    if (metodoPago === 'tarjeta' && !tarjeta) return Alert.alert("Falta Tarjeta", "Regístrala en tu perfil.");
    
    if (metodoPago === 'pse') {
      await Linking.openURL('https://www.pse.com.co/persona-natural');
    }

    setPaying(true);
    try {
      const response = await axios.post('http://192.168.1.70:3001/reservar-cupo', { 
        id: selectedP.id, 
        cantidad: cantidad, 
        tiempoHoras: horas, 
        tipo: tipoVehiculo, 
        metodo: metodoPago,
        usuario_nombre: userData.nombre, 
        usuario_email: userData.email    
      });

      if (response.data.success) {
        setIdReservaActiva(selectedP.id);
        setCodigoReserva(Math.random().toString(36).substring(2, 8).toUpperCase());
        setShowPayment(false);
        setShowTicket(true);
        cargarDatos();
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudo procesar la reserva."); 
    } finally {
      setPaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const hDisplay = h.toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60);
    const mDisplay = m.toString().padStart(2, '0');
    const s = seconds % 60;
    const sDisplay = s.toString().padStart(2, '0');
    return `${hDisplay}:${mDisplay}:${sDisplay}`;
  };

  const calcularTotal = () => {
    if (!selectedP) return 0;
    const factorPrecio = tipoVehiculo === 'moto' ? 0.5 : 1.0; 
    return Math.round(selectedP.precio * factorPrecio * cantidad * horas);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const filtered = parqueaderos.filter(p => p.nombre.toLowerCase().includes(text.toLowerCase()));
    setFilteredP(filtered);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('usuario_email');
          await SecureStore.deleteItemAsync('usuario_nombre');
          await SecureStore.deleteItemAsync('usuario_rol');
          router.replace('/');
      }}
    ]);
  };

  const handleAcceptTicket = () => {
    setTimeLeft(horas * 3600);
    setShowTicket(false);
    setSelectedP(null);
  };

  const renderVehiculoBadge = (tipo?: 'carro' | 'moto' | 'ambos') => {
    const config = {
      carro: { bg: '#EFF6FF', text: '#2563EB', icon: 'car' as const, label: 'Solo Carros' },
      moto: { bg: '#F5F3FF', text: '#7C3AED', icon: 'bicycle' as const, label: 'Solo Motos' },
      ambos: { bg: '#F0FDF4', text: '#16A34A', icon: 'options' as const, label: 'Carros y Motos' }
    };
    const current = config[tipo || 'ambos'];
    return (
      <View style={[styles.vehicleMiniBadge, { backgroundColor: current.bg }]}>
        <Ionicons name={current.icon} size={12} color={current.text} />
        <Text style={[styles.vehicleMiniText, { color: current.text }]}>{current.label}</Text>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput style={styles.searchInput} placeholder="¿A dónde vas?" value={search} onChangeText={handleSearch} />
        </View>
        <TouchableOpacity style={styles.profileCircle} onPress={() => setShowProfile(true)}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientCircle}>
            <Text style={styles.profileLetter}>{userData.nombre.charAt(0)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <MapView 
        provider={PROVIDER_GOOGLE}
        style={styles.map} 
        initialRegion={{ latitude: 6.2442, longitude: -75.5812, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onPress={() => { Keyboard.dismiss(); setSelectedP(null); setIsMinimized(false); }}
      >
        {filteredP.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: Number(p.lat), longitude: Number(p.lng) }} onPress={() => {
              setSelectedP(p);
              setIsMinimized(false);
              if (p.tipo_vehiculo === 'moto') setTipoVehiculo('moto');
              if (p.tipo_vehiculo === 'carro') setTipoVehiculo('carro');
              if (p.metodo_pago && !p.metodo_pago.includes(metodoPago)) {
                  const permitidos = p.metodo_pago.split(',');
                  setMetodoPago(permitidos[0] as any);
              }
          }}>
            <View style={[styles.marker, {backgroundColor: p.cupos_disponibles > 0 ? '#2563EB' : '#EF4444'}]}>
              <Text style={styles.markerText}>{p.cupos_disponibles}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {timeLeft > 0 && (
        <View style={styles.timeBadgeContainer}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.timeBadge}>
                <Ionicons name="timer-outline" size={20} color="#FFF" />
                <Text style={styles.timeBadgeText}>{formatTime(timeLeft)}</Text>
            </LinearGradient>
        </View>
      )}

      {selectedP && (
        <View style={[styles.detailSheet, isMinimized && styles.detailSheetMinimized]}>
          <View style={styles.sheetHandle} />
          
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMinimized ? 0 : 15}}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.detailTitle} numberOfLines={1}>{selectedP.nombre}</Text>
              <View style={{ marginTop: 4 }}>{renderVehiculoBadge(selectedP.tipo_vehiculo)}</View>
              {!isMinimized && <Text style={[styles.detailPriceSub, { marginTop: 4 }]}>${selectedP.precio}/h base</Text>}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity style={styles.minimizeBtn} onPress={() => setIsMinimized(!isMinimized)}>
                <Ionicons name={isMinimized ? "chevron-up-circle" : "chevron-down-circle"} size={26} color="#2563EB" />
              </TouchableOpacity>
              {isMinimized && (
                <TouchableOpacity onPress={() => setSelectedP(null)}>
                  <Ionicons name="close-circle" size={26} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {!isMinimized && (
              <View style={styles.vehicleSelector}>
                <TouchableOpacity onPress={() => setTipoVehiculo('carro')} disabled={selectedP.tipo_vehiculo === 'moto'} style={[styles.vehBtn, tipoVehiculo === 'carro' && styles.vehBtnActive, selectedP.tipo_vehiculo === 'moto' && { opacity: 0.2 }]}>
                  <Ionicons name="car" size={22} color={tipoVehiculo === 'carro' ? '#FFF' : '#64748B'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setTipoVehiculo('moto')} disabled={selectedP.tipo_vehiculo === 'carro'} style={[styles.vehBtn, tipoVehiculo === 'moto' && styles.vehBtnActive, selectedP.tipo_vehiculo === 'carro' && { opacity: 0.2 }]}>
                  <Ionicons name="bicycle" size={22} color={tipoVehiculo === 'moto' ? '#FFF' : '#64748B'} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isMinimized && (
            <>
              <View style={styles.inputsRow}>
                <View style={styles.miniSelector}>
                  <Text style={styles.labelSmall}>Celdas</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity onPress={() => setCantidad(Math.max(1, cantidad - 1))}><Ionicons name="remove-circle-outline" size={28} color="#2563EB" /></TouchableOpacity>
                    <Text style={styles.counterText}>{cantidad}</Text>
                    {/* 🔄 VALIDACIÓN REACTIVA: Evita que Mateo sume celdas si Marcos ya las reservó de fondo */}
                    <TouchableOpacity onPress={() => {
                      const pFresco = parqueaderos.find(p => p.id === selectedP.id);
                      const cuposReales = pFresco ? pFresco.cupos_disponibles : selectedP.cupos_disponibles;
                      if (cantidad < cuposReales) { 
                        setCantidad(cantidad + 1); 
                      } else { 
                        Alert.alert("Sin Cupos", "No hay más celdas disponibles en este momento."); 
                      }
                    }}><Ionicons name="add-circle-outline" size={28} color="#2563EB" /></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.miniSelector}>
                  <Text style={styles.labelSmall}>Horas</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity onPress={() => setHoras(Math.max(1, horas - 1))}><Ionicons name="remove-circle-outline" size={28} color="#64748B" /></TouchableOpacity>
                    <Text style={styles.counterText}>{horas}</Text>
                    <TouchableOpacity onPress={() => setHoras(horas + 1)}><Ionicons name="add-circle-outline" size={28} color="#64748B" /></TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={styles.labelSmall}>Métodos Disponibles</Text>
              <View style={styles.paymentSelector}>
                {selectedP.metodo_pago?.includes('tarjeta') && (
                    <TouchableOpacity onPress={() => setMetodoPago('tarjeta')} style={[styles.payMethodBtn, metodoPago === 'tarjeta' && styles.payMethodActive]}>
                        <Ionicons name="card-outline" size={18} color={metodoPago === 'tarjeta' ? '#FFF' : '#64748B'} />
                        <Text style={[styles.payMethodText, metodoPago === 'tarjeta' && {color: '#FFF'}]}>Tarjeta</Text>
                    </TouchableOpacity>
                )}
                {selectedP.metodo_pago?.includes('pse') && (
                    <TouchableOpacity onPress={() => setMetodoPago('pse')} style={[styles.payMethodBtn, metodoPago === 'pse' && styles.payMethodActivePSE]}>
                        <Ionicons name="globe-outline" size={18} color={metodoPago === 'pse' ? '#FFF' : '#64748B'} />
                        <Text style={[styles.payMethodText, metodoPago === 'pse' && {color: '#FFF'}]}>PSE</Text>
                    </TouchableOpacity>
                )}
                {selectedP.metodo_pago?.includes('efectivo') && (
                    <TouchableOpacity onPress={() => setMetodoPago('efectivo')} style={[styles.payMethodBtn, metodoPago === 'efectivo' && styles.payMethodActive]}>
                        <Ionicons name="cash-outline" size={18} color={metodoPago === 'efectivo' ? '#FFF' : '#64748B'} />
                        <Text style={[styles.payMethodText, metodoPago === 'efectivo' && {color: '#FFF'}]}>Efectivo</Text>
                    </TouchableOpacity>
                )}
              </View>

              <View style={styles.totalBox}><Text style={styles.totalLabel}>Total:</Text><Text style={styles.totalValue}>${calcularTotal()}</Text></View>
              <TouchableOpacity style={[styles.reserveBtn, (selectedP.cupos_disponibles <= 0) && {backgroundColor: '#94A3B8'}]} disabled={selectedP.cupos_disponibles <= 0} onPress={() => setShowPayment(true)}>
                <Text style={styles.reserveText}>RESERVAR Y PAGAR</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* MODAL PERFIL */}
      <Modal visible={showProfile} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileSheet}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowProfile(false)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.largeCircle}><Text style={styles.largeLetter}>{userData.nombre.charAt(0)}</Text></LinearGradient>
            <Text style={styles.pName}>{userData.nombre}</Text>
            <Text style={styles.pEmail}>{userData.email}</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowEdit(true); setShowProfile(false); }}><Ionicons name="person-outline" size={22} color="#1E293B" /><Text style={styles.menuText}>Editar Perfil</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowProfile(false); setShowHistorial(true); cargarHistorialCliente(); }}><Ionicons name="time-outline" size={22} color="#10B981" /><Text style={styles.menuText}>Mis Reservas</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAddCard(true); setShowProfile(false); }}><Ionicons name="card-outline" size={22} color="#2563EB" /><Text style={styles.menuText}>Mi Tarjeta</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSecurity(true); setShowProfile(false); }}><Ionicons name="lock-closed-outline" size={22} color="#F59E0B" /><Text style={styles.menuText}>Seguridad</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Ionicons name="log-out-outline" size={22} color="#EF4444" /><Text style={[styles.menuText, {color: '#EF4444'}]}>Cerrar Sesión</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL HISTORIAL DE RESERVAS */}
      <Modal visible={showHistorial} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.profileSheet, { height: '80%' }]}>
            <View style={styles.sheetHandle} />
            
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.detailTitle, { fontSize: 22 }]}>Mis Reservas 🕒</Text>
              <TouchableOpacity onPress={() => setShowHistorial(false)}>
                <Ionicons name="close-circle" size={30} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingHistorial ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
            ) : historial.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Ionicons name="receipt-outline" size={60} color="#CBD5E1" />
                <Text style={{ color: '#64748B', marginTop: 10, fontSize: 16 }}>Aún no tienes reservas registradas.</Text>
              </View>
            ) : (
              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {historial.map((item) => (
                  <View key={item.id} style={styles.historialCard}>
                    <View style={styles.historialHeader}>
                      <Text style={styles.historialLugar}>{item.parqueaderos?.nombre || 'Parqueadero General'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: item.estado === 'activa' ? '#D1FAE5' : '#F1F5F9' }]}>
                        <Text style={[styles.statusText, { color: item.estado === 'activa' ? '#065F46' : '#475569' }]}>
                          {item.estado.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historialFecha}>
                      │ 📆 {new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={styles.historialDetallesRow}>
                      <Text style={styles.historialDetalleText}>🚗 {item.vehiculo_tipo === 'carro' ? 'Carro' : 'Moto'}</Text>
                      <Text style={styles.historialDetalleText}>🔲 {item.cantidad_celdas} und</Text>
                      <Text style={styles.historialDetalleText}>⏱️ {item.horas_reservadas}h</Text>
                    </View>
                    <View style={styles.historialFooter}>
                      <Text style={styles.historialMetodo}>CNX: {item.metodo_pago.toUpperCase()}</Text>
                      <Text style={styles.historialTotal}>${item.total_pago.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR PERFIL */}
      <Modal visible={showEdit} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Editar Perfil</Text>
            <Text style={styles.inputLabel}>Nombre Completo</Text>
            <TextInput style={styles.editInput} value={tempNombre} onChangeText={setTempNombre} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}><Text style={styles.saveText}>Guardar</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop:15}} onPress={() => { setShowEdit(false); setShowProfile(true); }}><Text style={{color:'#64748B'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL AGREGAR TARJETA */}
      <Modal visible={showAddCard} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Método de Pago</Text>
            <Text style={styles.inputLabel}>Banco</Text>
            <TextInput style={styles.editInput} placeholder="Ej: Bancolombia" value={bancoTarjetaInput} onChangeText={setBancoTarjetaInput} />
            <Text style={styles.inputLabel}>Número de Tarjeta</Text>
            <TextInput style={styles.editInput} placeholder="0000 0000 0000 0000" keyboardType="numeric" maxLength={16} value={numTarjetaInput} onChangeText={setNumTarjetaInput} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleRegisterCard}><Text style={styles.saveText}>Vincular Tarjeta</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop:15}} onPress={() => { setShowAddCard(false); setShowProfile(true); }}><Text style={{color:'#64748B'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SEGURIDAD */}
      <Modal visible={showSecurity} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Seguridad</Text>
            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <TextInput style={styles.editInput} secureTextEntry value={tempPass} onChangeText={setTempPass} placeholder="Mínimo 4 caracteres" />
            <TouchableOpacity style={[styles.saveBtn, {backgroundColor:'#F59E0B'}]} onPress={handleChangePassword}><Text style={styles.saveText}>Cambiar Contraseña</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, {backgroundColor:'#EF4444', marginTop:10}]} onPress={handleDeleteAccount}><Text style={styles.saveText}>ELIMINAR MI CUENTA</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop:15}} onPress={() => { setShowSecurity(false); setShowProfile(true); }}><Text style={{color:'#64748B'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL TICKET */}
      <Modal visible={showTicket} animationType="slide" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.ticketCard}>
             <Ionicons name="checkmark-circle" size={60} color="#10B981" />
             <Text style={styles.ticketTitle}>¡Reserva Lista!</Text>
             <View style={styles.codeBox}><Text style={styles.codeText}>{codigoReserva}</Text></View>
             <TouchableOpacity style={styles.ticketBtn} onPress={handleAcceptTicket}><Text style={styles.ticketBtnText}>ENTENDIDO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL PAGO */}
      <Modal visible={showPayment} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentHeader}>Confirmar Pago 💳</Text>
            <View style={styles.payRow}><Text style={styles.totalLabel}>Método:</Text><Text style={{fontWeight:'bold', textTransform:'capitalize'}}>{metodoPago}</Text></View>
            <View style={styles.payRow}><Text style={styles.totalLabel}>Total:</Text><Text style={styles.totalValue}>${calcularTotal()} COP</Text></View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleProcessPayment} disabled={paying}>
              {paying ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>CONFIRMAR</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPayment(false)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// 🎨 ESTILOS REPARADOS SIN CORTES Y COMPLETOS
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  topHeader: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10, flexDirection: 'row', gap: 12 },
  searchBar: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 55, elevation: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  profileCircle: { width: 55, height: 55, borderRadius: 28, elevation: 10 },
  gradientCircle: { flex: 1, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  profileLetter: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  marker: { padding: 8, borderRadius: 12, borderWidth: 2, borderColor: '#FFF', minWidth: 35, alignItems: 'center' },
  markerText: { color: '#FFF', fontWeight: 'bold' },
  timeBadgeContainer: { position: 'absolute', top: 120, width: '100%', alignItems: 'center', zIndex: 5 },
  timeBadge: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, alignItems: 'center', elevation: 8 },
  timeBadgeText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  
  detailSheet: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 30, padding: 25, elevation: 20 },
  detailSheetMinimized: { paddingVertical: 15, paddingHorizontal: 25, borderRadius: 20, bottom: 20 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 15 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  detailPriceSub: { fontSize: 13, color: '#64748B' },
  minimizeBtn: { padding: 2, justifyContent: 'center', alignItems: 'center' },
  vehicleSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  vehBtn: { padding: 8, borderRadius: 10, width: 45, alignItems: 'center' },
  vehBtnActive: { backgroundColor: '#2563EB', elevation: 3 },
  inputsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
  miniSelector: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 15, padding: 12, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  labelSmall: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterText: { fontSize: 18, fontWeight: 'bold', minWidth: 25, textAlign: 'center' },
  
  paymentSelector: { flexDirection: 'row', justifyContent: 'space-between', gap: 5, marginBottom: 15 },
  payMethodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 5 },
  payMethodActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  payMethodActivePSE: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  payMethodText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  reserveBtn: { backgroundColor: '#2563EB', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  reserveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  profileSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-end' },
  largeCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  largeLetter: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  pName: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  pEmail: { fontSize: 14, color: '#64748B', marginBottom: 25 },
  menuItem: { flexDirection: 'row', width: '100%', paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 15 },
  menuText: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  
  editCard: { backgroundColor: '#FFF', width: '100%', borderRadius: 25, padding: 25, alignItems: 'center', elevation: 10 },
  editTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1E293B' },
  inputLabel: { alignSelf: 'flex-start', fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 8, marginLeft: 5 },
  editInput: { backgroundColor: '#F8FAFC', width: '100%', height: 50, borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  saveBtn: { backgroundColor: '#2563EB', width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  ticketCard: { backgroundColor: '#FFF', width: width * 0.8, borderRadius: 25, padding: 30, alignItems: 'center', elevation: 15 },
  ticketTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: '#1E293B' },
  codeBox: { backgroundColor: '#F1F5F9', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 15, marginVertical: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1' },
  codeText: { fontSize: 26, fontWeight: '900', color: '#2563EB', letterSpacing: 2 },
  ticketBtn: { backgroundColor: '#10B981', width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ticketBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  paymentContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  paymentHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  confirmBtn: { backgroundColor: '#10B981', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignItems: 'center' },
  cancelText: { color: '#EF4444', fontWeight: '600' },
  
  historialCard: { backgroundColor: '#F8FAFC', width: '100%', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  historialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historialLugar: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  historialFecha: { fontSize: 13, color: '#64748B', marginBottom: 12 },
  historialDetallesRow: { flexDirection: 'row', gap: 15, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  historialDetalleText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  historialFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historialMetodo: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
  historialTotal: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  vehicleMiniBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', gap: 4 },
  vehicleMiniText: { fontSize: 11, fontWeight: '700' }
});