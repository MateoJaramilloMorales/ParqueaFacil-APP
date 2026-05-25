import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Modal, StatusBar, Image, RefreshControl, Switch } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store'; // 🛡️ Importado para corregir el borrado de sesión

const { height, width } = Dimensions.get('window');

interface Parqueadero {
  id: number;
  nombre: string;
  cupos_totales: number;
  cupos_disponibles: number;
  precio: number; 
  lat: number | string;
  lng: number | string;
  metodo_pago: string; 
  estado_operacion: 'abierto' | 'cerrado';
  tipo_vehiculo: 'carro' | 'moto' | 'ambos';
  fotos?: string[];
}

interface Reserva {
  id: number;
  parqueadero_id: number;
  usuario_nombre: string;
  usuario_email: string;
  vehiculo_tipo: string;
  cantidad_celdas: number;
  amount_celdas?: number; 
  horas_reservadas: number;
  total_pago: number;
  metodo_pago: string;
  created_at: string;
  estado: string;
  parqueaderos?: { nombre: string };
}

export default function AdminPanel() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [cupos, setCupos] = useState('');
  const [precio, setPrecio] = useState(''); 
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto' | 'ambos'>('ambos');
  const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>(['efectivo']); 
  const [fotos, setFotos] = useState<string[]>([]);
  const [aceptarTerminos, setAceptarTerminos] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); 
  const [misParqueaderos, setMisParqueaderos] = useState<Parqueadero[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [tab, setTab] = useState<'registrar' | 'puntos' | 'reservas'>('registrar');
  const [isMinimized, setIsMinimized] = useState(false);

  const [userData, setUserData] = useState({ nombre: 'Mateo Admin', email: 'admin@gmail.com' });
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [tempNombre, setTempNombre] = useState(userData.nombre);
  const [tempPass, setTempPass] = useState('');

  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);
  const [nuevoTiempo, setNuevoTiempo] = useState('');
  const [showTiempoModal, setShowTiempoModal] = useState(false);

  const [location, setLocation] = useState({
    latitude: 6.2442,
    longitude: -75.5812,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const cargarMisRegistros = async () => {
    try {
      const res = await axios.get('http://192.168.1.70:3001/parqueaderos');
      setMisParqueaderos(res.data);
    } catch (e) { console.log("Error registros"); }
  };

  const cargarHistorial = async () => {
    try {
      const res = await axios.get('http://192.168.1.70:3001/historial-reservas');
      if (Array.isArray(res.data)) {
        setReservas(res.data);
      }
    } catch (e: any) { 
        console.log("Error historial:", e.message); 
    }
  };

  // 🔥 Función corregida para Cerrar Sesión de raíz de forma segura
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('usuario_email');
      await SecureStore.deleteItemAsync('usuario_rol');
      setShowProfile(false);
      router.replace('/'); // Redirige al Welcome/Login limpio
    } catch (error) {
      Alert.alert("Error", "No se pudo cerrar la sesión correctamente.");
    }
  };

  const toggleEstadoParqueadero = async (id: number, estadoActual: 'abierto' | 'cerrado') => {
    const nuevoEstado = estadoActual === 'abierto' ? 'cerrado' : 'abierto';
    try {
      setMisParqueaderos(prev => prev.map(p => p.id === id ? { ...p, estado_operacion: nuevoEstado } : p));
      await axios.put(`http://192.168.1.70:3001/parqueaderos/${id}/estado`, {
        estado_operacion: nuevoEstado
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el estado del parqueadero.");
      cargarMisRegistros();
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([cargarMisRegistros(), cargarHistorial()]);
    setRefreshing(false);
  }, []);

  useEffect(() => { 
    cargarMisRegistros();
    cargarHistorial();
    const interval = setInterval(cargarHistorial, 5000); 
    return () => clearInterval(interval);
  }, []);

  const abrirModificarTiempo = (reserva: Reserva) => {
    setReservaSeleccionada(reserva);
    setNuevoTiempo(reserva.horas_reservadas.toString());
    setShowTiempoModal(true);
  };

  const guardarNuevoTiempo = async () => {
    if (!reservaSeleccionada || !nuevoTiempo) return;
    const horas = parseInt(nuevoTiempo);
    if (isNaN(horas) || horas <= 0) return Alert.alert("Error", "Ingresa una cantidad de horas válida.");

    try {
      const pq = misParqueaderos.find(p => p.id === reservaSeleccionada.parqueadero_id);
      const precioBase = pq ? pq.precio : (reservaSeleccionada.total_pago / reservaSeleccionada.horas_reservadas / reservaSeleccionada.cantidad_celdas);
      const factorTipo = reservaSeleccionada.vehiculo_tipo === 'moto' ? 0.5 : 1.0;
      const nuevoTotal = Math.round(precioBase * factorTipo * reservaSeleccionada.cantidad_celdas * horas);

      await axios.put(`http://192.168.1.70:3001/modificar-reserva/${reservaSeleccionada.id}`, {
        horas_reservadas: horas,
        total_pago: nuevoTotal
      });

      setShowTiempoModal(false);
      setReservaSeleccionada(null);
      cargarHistorial();
      Alert.alert("Éxito", "Tiempo de la reserva modificado.");
    } catch (e) {
      Alert.alert("Error", "No se pudo cambiar el tiempo.");
    }
  };

  const handleCancelarReserva = (id: number) => {
    Alert.alert("🚨 Cancelar Reserva", "¿Estás seguro de que deseas dar de baja esta reserva y liberar sus celdas?", [
      { text: "Volver", style: "cancel" },
      { text: "Confirmar Cancelación", style: "destructive", onPress: async () => {
          try {
            await axios.post(`http://192.168.1.70:3001/cancelar-reserva/${id}`);
            cargarHistorial();
            cargarMisRegistros();
            Alert.alert("Cancelada", "La reserva ha sido anulada con éxito.");
          } catch (e) {
            Alert.alert("Error", "No se pudo cancelar la reserva.");
          }
      }}
    ]);
  };

  const seleccionarFoto = async () => {
    if (fotos.length >= 3) return Alert.alert("Límite", "Máximo 3 fotos.");
    let resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!resultado.canceled) setFotos([...fotos, resultado.assets[0].uri]);
  };

  const eliminarFoto = (uri: string) => setFotos(fotos.filter(f => f !== uri));

  const toggleMetodo = (metodo: string) => {
    if (metodosSeleccionados.includes(metodo)) {
      if (metodosSeleccionados.length > 1) setMetodosSeleccionados(metodosSeleccionados.filter(m => m !== metodo));
      else Alert.alert("Atención", "Mínimo un método.");
    } else setMetodosSeleccionados([...metodosSeleccionados, metodo]);
  };

  const handlePublish = async () => {
    if (!nombre || !cupos || !precio) return Alert.alert("Error", "Completa los campos");
    if (!aceptarTerminos) return Alert.alert("Atención", "Debes aceptar los términos.");
    
    setLoading(true);
    try {
      await axios.post('http://192.168.1.70:3001/parqueaderos', {
        nombre, cupos_totales: parseInt(cupos), cupos_disponibles: parseInt(cupos),
        precio: parseFloat(precio), lat: location.latitude, lng: location.longitude,
        direccion: "Ubicación en mapa", metodo_pago: metodosSeleccionados.join(','), 
        fotos: fotos, estado_operacion: 'abierto',
        tipo_vehiculo: tipoVehiculo 
      });
      setNombre(''); setCupos(''); setPrecio(''); setFotos([]); setAceptarTerminos(false); setTipoVehiculo('ambos');
      Keyboard.dismiss();
      cargarMisRegistros();
      setTab('puntos');
      Alert.alert("Éxito", "Parqueadero registrado ✅");
    } catch (e) { Alert.alert("Error", "Fallo al guardar"); }
    finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`http://192.168.1.70:3001/usuarios/${userData.email}`, { nombre: tempNombre });
      setUserData({ ...userData, nombre: tempNombre });
      setShowEdit(false);
      Alert.alert("Éxito", "Perfil actualizado");
    } catch (e) { Alert.alert("Error", "No se pudo actualizar."); }
  };

  const handleChangePassword = async () => {
    if (tempPass.length < 4) return Alert.alert("Error", "Contraseña corta.");
    try {
      await axios.put(`http://192.168.1.70:3001/usuarios/${userData.email}`, { password: tempPass });
      setTempPass('');
      setShowSecurity(false);
      Alert.alert("Éxito", "Contraseña cambiada");
    } catch (e) { Alert.alert("Error", "Fallo al cambiar."); }
  };

  const handleDeleteAccount = () => {
    Alert.alert("⚠️ ELIMINAR CUENTA", "¿Borrar cuenta de administrador?", [
      { text: "Cancelar", style: "cancel" },
      { text: "ELIMINAR", style: "destructive", onPress: async () => {
          await axios.delete(`http://192.168.1.70:3001/usuarios/${userData.email}`);
          await SecureStore.deleteItemAsync('usuario_email');
          await SecureStore.deleteItemAsync('usuario_rol');
          router.replace('/');
      }}
    ]);
  };

  const handleDeleteParqueadero = (id: number, nombreP: string) => {
    Alert.alert("Borrar", `¿Eliminar "${nombreP}"?`, [
      { text: "No" },
      { text: "Sí", style: "destructive", onPress: async () => {
          await axios.delete(`http://192.168.1.70:3001/parqueaderos/${id}`);
          cargarMisRegistros();
      }}
    ]);
  };

  const renderVehiculoBadge = (tipo: 'carro' | 'moto' | 'ambos') => {
    if (tipo === 'carro') {
      return (
        <View style={[styles.vehicleMiniBadge, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="car" size={12} color="#2563EB" />
          <Text style={[styles.vehicleMiniText, { color: '#2563EB' }]}>Solo Carros</Text>
        </View>
      );
    } else if (tipo === 'moto') {
      return (
        <View style={[styles.vehicleMiniBadge, { backgroundColor: '#F5F3FF' }]}>
          <Ionicons name="bicycle" size={12} color="#7C3AED" />
          <Text style={[styles.vehicleMiniText, { color: '#7C3AED' }]}>Solo Motos</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.vehicleMiniBadge, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="options" size={12} color="#16A34A" />
          <Text style={[styles.vehicleMiniText, { color: '#16A34A' }]}>Carros y Motos</Text>
        </View>
      );
    }
  };

  const renderReservaPagoBadge = (metodo: string) => {
    const format = metodo ? metodo.toLowerCase().trim() : 'efectivo';
    if (format === 'tarjeta') {
      return (
        <View style={[styles.payResBadge, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="card" size={12} color="#0369A1" />
          <Text style={[styles.payResText, { color: '#0369A1' }]}>Tarjeta</Text>
        </View>
      );
    } else if (format === 'pse') {
      return (
        <View style={[styles.payResBadge, { backgroundColor: '#E0E7FF' }]}>
          <Ionicons name="globe" size={12} color="#4338CA" />
          <Text style={[styles.payResText, { color: '#4338CA' }]}>PSE</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.payResBadge, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="cash" size={12} color="#047857" />
          <Text style={[styles.payResText, { color: '#047857' }]}>Efectivo</Text>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <MapView 
        provider={PROVIDER_GOOGLE} 
        style={styles.map} 
        initialRegion={location} 
        onRegionChangeComplete={setLocation}
      >
        {misParqueaderos.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: Number(p.lat), longitude: Number(p.lng) }}>
              <View style={[styles.customMarker, p.estado_operacion === 'cerrado' && { backgroundColor: '#EF4444' }]}>
                  <Ionicons name={p.estado_operacion === 'cerrado' ? "business" : p.tipo_vehiculo === 'moto' ? 'bicycle' : 'car'} size={18} color="#FFF" />
              </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.markerFixed} pointerEvents="none">
        <Ionicons name="location" size={45} color="#2563EB" />
        <View style={styles.markerShadow} />
      </View>

      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.profileCircle} onPress={() => setShowProfile(true)}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientCircle}>
            <Text style={styles.profileLetter}>{userData.nombre.charAt(0)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={[styles.sheet, isMinimized && { height: 75 }]}>
        <TouchableOpacity style={styles.handleContainer} onPress={() => setIsMinimized(!isMinimized)}>
          <View style={styles.handle} />
          {isMinimized && <Text style={styles.minimizedLabel}>Módulos Administrador (Toca para expandir)</Text>}
        </TouchableOpacity>

        {!isMinimized && (
          <>
            <View style={styles.tabContainer}>
              <TouchableOpacity onPress={() => setTab('registrar')} style={[styles.tab, tab === 'registrar' && styles.tabActive]}>
                <Ionicons name="add-circle" size={18} color={tab === 'registrar' ? '#2563EB' : '#94A3B8'} />
                <Text style={[styles.tabText, tab === 'registrar' && styles.tabTextActive]}>Registrar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setTab('puntos')} style={[styles.tab, tab === 'puntos' && styles.tabActive]}>
                <Ionicons name="business" size={18} color={tab === 'puntos' ? '#2563EB' : '#94A3B8'} />
                <Text style={[styles.tabText, tab === 'puntos' && styles.tabTextActive]}>Mis Puntos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setTab('reservas'); cargarHistorial(); }} style={[styles.tab, tab === 'reservas' && styles.tabActive]}>
                <Ionicons name="list" size={18} color={tab === 'reservas' ? '#2563EB' : '#94A3B8'} />
                <Text style={[styles.tabText, tab === 'reservas' && styles.tabTextActive]}>Reservas</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 30 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              
              {tab === 'registrar' && (
                <View style={styles.registrarContainer}>
                  <View style={styles.locationBadge}>
                    <Ionicons name="navigate" size={14} color="#2563EB" />
                    <Text style={styles.locationText}>Ubicación fijada en el centro del mapa</Text>
                  </View>

                  <View style={styles.inputGroupCard}>
                    <View style={styles.inputIconRow}>
                      <Ionicons name="business-outline" size={20} color="#64748B" />
                      <TextInput style={styles.inputModern} placeholder="Nombre del Establecimiento" value={nombre} onChangeText={setNombre} />
                    </View>
                    
                    <View style={styles.rowInputs}>
                      <View style={[styles.inputIconRow, { flex: 1 }]}>
                        <Ionicons name="grid-outline" size={20} color="#64748B" />
                        <TextInput style={styles.inputModern} placeholder="Celdas" keyboardType="numeric" value={cupos} onChangeText={setCupos} />
                      </View>
                      <View style={[styles.inputIconRow, { flex: 1 }]}>
                        <Ionicons name="cash-outline" size={20} color="#64748B" />
                        <TextInput style={styles.inputModern} placeholder="Precio/Hr" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.labelSmall}>¿Qué vehículos recibe?</Text>
                  <View style={styles.vehicleSelector}>
                    <TouchableOpacity onPress={() => setTipoVehiculo('carro')} style={[styles.vehicleOption, tipoVehiculo === 'carro' && styles.vehicleOptionActive]}>
                      <Ionicons name="car" size={20} color={tipoVehiculo === 'carro' ? '#FFF' : '#64748B'} />
                      <Text style={[styles.vehicleOptionText, tipoVehiculo === 'carro' && { color: '#FFF' }]}>Sólo Carros</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => setTipoVehiculo('moto')} style={[styles.vehicleOption, tipoVehiculo === 'moto' && styles.vehicleOptionActive]}>
                      <Ionicons name="bicycle" size={20} color={tipoVehiculo === 'moto' ? '#FFF' : '#64748B'} />
                      <Text style={[styles.vehicleOptionText, tipoVehiculo === 'moto' && { color: '#FFF' }]}>Sólo Motos</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => setTipoVehiculo('ambos')} style={[styles.vehicleOption, tipoVehiculo === 'ambos' && styles.vehicleOptionActive]}>
                      <Ionicons name="options" size={20} color={tipoVehiculo === 'ambos' ? '#FFF' : '#64748B'} />
                      <Text style={[styles.vehicleOptionText, tipoVehiculo === 'ambos' && { color: '#FFF' }]}>Ambos</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.labelSmall}>Fotos del lugar (Máx. 3)</Text>
                  <View style={styles.photoList}>
                    {fotos.map((uri, index) => (
                      <View key={index} style={styles.photoWrapper}>
                        <Image source={{ uri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.btnRemovePhoto} onPress={() => eliminarFoto(uri)}>
                          <Ionicons name="close-circle" size={22} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {fotos.length < 3 && (
                      <TouchableOpacity style={styles.btnAddPhoto} onPress={seleccionarFoto}>
                        <Ionicons name="camera-outline" size={32} color="#CBD5E1" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.labelSmall}>Pagos aceptados</Text>
                  <View style={styles.paySelectorAdmin}>
                    {['tarjeta', 'pse', 'efectivo'].map((m) => (
                      <TouchableOpacity key={m} onPress={() => toggleMetodo(m)} style={[styles.payOption, metodosSeleccionados.includes(m) && styles.payOptionActive]}>
                        <Text style={[styles.payOptionText, metodosSeleccionados.includes(m) && { color: '#FFF' }]}>{m.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.termsContainer} onPress={() => setAceptarTerminos(!aceptarTerminos)}>
                    <Ionicons name={aceptarTerminos ? "checkbox" : "square-outline"} size={24} color={aceptarTerminos ? "#2563EB" : "#64748B"} />
                    <Text style={styles.termsText}>Confirmo los datos y la ubicación.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handlePublish} disabled={loading || !aceptarTerminos} style={styles.mainBtnWrapper}>
                    <LinearGradient colors={aceptarTerminos ? ['#3B82F6', '#1E40AF'] : ['#94A3B8', '#64748B']} style={styles.mainBtnModern}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainBtnText}>PUBLICAR PARQUEADERO</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {tab === 'puntos' && (
                <View style={{ paddingTop: 10 }}>
                  <Text style={styles.sectionTitle}>Tus Parqueaderos Activos</Text>
                  {misParqueaderos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="business-outline" size={50} color="#CBD5E1" />
                      <Text style={styles.emptyText}>No tienes puntos registrados aún.</Text>
                    </View>
                  ) : (
                    misParqueaderos.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <View style={styles.cardContent}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.cardName}>{item.nombre}</Text>
                            <View style={[styles.statusMiniBadge, { backgroundColor: item.estado_operacion === 'cerrado' ? '#FEE2E2' : '#D1FAE5' }]}>
                              <Text style={[styles.statusMiniText, { color: item.estado_operacion === 'cerrado' ? '#EF4444' : '#10B981' }]}>
                                {item.estado_operacion === 'cerrado' ? 'Cerrado' : 'Abierto'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ marginVertical: 4 }}>
                            {renderVehiculoBadge(item.tipo_vehiculo || 'ambos')}
                          </View>
                          <Text style={styles.cardSub}>Pagos: {item.metodo_pago?.split(',').join(' | ').toUpperCase()} • {item.cupos_disponibles} Celdas</Text>
                        </View>
                        
                        <View style={{ alignItems: 'center', marginRight: 10 }}>
                          <Switch
                            trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                            thumbColor={item.estado_operacion === 'abierto' ? '#10B981' : '#64748B'}
                            onValueChange={() => toggleEstadoParqueadero(item.id, item.estado_operacion)}
                            value={item.estado_operacion === 'abierto'}
                          />
                        </View>

                        <TouchableOpacity onPress={() => handleDeleteParqueadero(item.id, item.nombre)} style={styles.deleteAction}>
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {tab === 'reservas' && (
                <View style={{ paddingTop: 10 }}>
                  <Text style={styles.sectionTitle}>Reservas Recibidas 🚦</Text>
                  {reservas.map((res) => (
                    <View key={res.id} style={[styles.reservaCard, res.estado === 'cancelada' && { opacity: 0.5, backgroundColor: '#F1F5F9' }]}>
                      <View style={styles.reservaIconBox}>
                          <Ionicons name={res.vehiculo_tipo === 'carro' ? 'car' : 'bicycle'} size={24} color={res.estado === 'cancelada' ? '#94A3B8' : '#2563EB'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                          <Text style={styles.reservaUser} numberOfLines={1}>{res.usuario_nombre || 'Conductor'}</Text>
                          <View style={[styles.statusBadge, res.estado === 'cancelada' && { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.statusText, res.estado === 'cancelada' && { color: '#991B1B' }]}>{res.estado.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.reservaInfo} numberOfLines={1}>📍 {res.parqueaderos?.nombre || 'Mi Establecimiento'}</Text>
                        <Text style={styles.reservaSubInfo}>{`${res.horas_reservadas || 0}h • ${res.amount_celdas ?? res.cantidad_celdas ?? 0} celdas`}</Text>
                        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>{renderReservaPagoBadge(res.metodo_pago)}</View>
                        {res.estado === 'activa' && (
                          <View style={styles.adminActionRow}>
                            <TouchableOpacity style={styles.btnActionEdit} onPress={() => abrirModificarTiempo(res)}>
                              <Ionicons name="time-outline" size={14} color="#D97706" />
                              <Text style={styles.btnActionEditText}>Tiempo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnActionCancel} onPress={() => handleCancelarReserva(res.id)}>
                              <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                              <Text style={styles.btnActionCancelText}>Dar de baja</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                      <View style={{alignItems: 'flex-end', marginLeft: 6}}>
                          <Text style={[styles.reservaMonto, res.estado === 'cancelada' && { color: '#64748B' }]}>${res.total_pago}</Text>
                          <Text style={styles.reservaTime}>{new Date(res.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* Modales */}
      <Modal visible={showTiempoModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Modificar Tiempo ⏰</Text>
            <Text style={{color: '#64748B', fontSize: 13, marginBottom: 15, textAlign: 'center'}}>
              Ajusta las horas de la estancia. El nuevo monto se recalculará automáticamente.
            </Text>
            <TextInput style={styles.editInput} placeholder="Ej: 3" keyboardType="numeric" value={nuevoTiempo} onChangeText={setNuevoTiempo} />
            <TouchableOpacity style={styles.saveBtn} onPress={guardarNuevoTiempo}><Text style={styles.saveText}>ACTUALIZAR HORAS</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowTiempoModal(false); setReservaSeleccionada(null); }} style={{marginTop: 15}}><Text style={{color: '#64748B', fontWeight: '600'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showProfile} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.profileSheet}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowProfile(false)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.largeCircle}><Text style={styles.largeLetter}>{userData.nombre.charAt(0)}</Text></LinearGradient>
            <Text style={styles.pName}>{userData.nombre}</Text>
            <Text style={styles.pEmail}>{userData.email}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowEdit(true); setShowProfile(false); }}><Ionicons name="person-outline" size={22} color="#1E293B" /><Text style={styles.menuText}> Editar Perfil</Text></TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSecurity(true); setShowProfile(false); }}><Ionicons name="lock-closed-outline" size={22} color="#F59E0B" /><Text style={styles.menuText}> Seguridad</Text></TouchableOpacity>
            
            {/* Botón de Cerrar Sesión corregido vinculando handleLogout */}
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={[styles.menuText, {color: '#EF4444'}]}> Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSecurity} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Seguridad 🔐</Text>
            <TextInput style={styles.editInput} placeholder="Nueva Contraseña" value={tempPass} onChangeText={setTempPass} secureTextEntry />
            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}><Text style={styles.saveText}>CAMBIAR CONTRASEÑA</Text></TouchableOpacity>
            <View style={{height: 1, backgroundColor: '#E2E8F0', width: '100%', marginVertical: 20}} />
            <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#EF4444'}]} onPress={handleDeleteAccount}><Text style={styles.saveText}>ELIMINAR MI CUENTA</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSecurity(false)} style={{marginTop: 15}}><Text style={{color: '#64748B'}}>Volver</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEdit} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Editar Datos</Text>
            <TextInput style={styles.editInput} value={tempNombre} onChangeText={setTempNombre} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}><Text style={styles.saveText}>GUARDAR CAMBIOS</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEdit(false)} style={{marginTop: 15}}><Text style={{color: '#64748B'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: { backgroundColor: '#2563EB', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 5 },
  markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -22.5, marginTop: -45, alignItems: 'center' },
  markerShadow: { width: 12, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, marginTop: -2 },
  topHeader: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  profileCircle: { width: 50, height: 50, borderRadius: 25, elevation: 10 },
  gradientCircle: { flex: 1, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  profileLetter: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', height: height * 0.75, backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 25, elevation: 30, shadowColor: '#000', shadowOpacity: 0.2 },
  handleContainer: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  handle: { width: 50, height: 6, backgroundColor: '#E2E8F0', borderRadius: 10, marginBottom: 4 },
  minimizedLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },
  
  // Tabs Navigation
  tabContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 15, padding: 5, marginBottom: 15 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 5, borderRadius: 12 },
  tabActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  tabText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  tabTextActive: { color: '#2563EB' },

  // Registrar Formulario
  registrarContainer: { gap: 12 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 12, gap: 6 },
  locationText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  inputGroupCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 15, gap: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  inputIconRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 },
  inputModern: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: '#1E293B' },
  rowInputs: { flexDirection: 'row', gap: 10 },
  labelSmall: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 5 },
  
  // Selector Tipo de Vehículos
  vehicleSelector: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  vehicleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  vehicleOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  vehicleOptionText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Fotos picker 
  photoList: { flexDirection: 'row', gap: 10, marginTop: 5 },
  photoWrapper: { width: 70, height: 70, borderRadius: 12, position: 'relative' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 12 },
  btnRemovePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FFF', borderRadius: 10 },
  btnAddPhoto: { width: 70, height: 70, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // Selector Métodos de Pago
  paySelectorAdmin: { flexDirection: 'row', gap: 8 },
  payOption: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  payOptionActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  payOptionText: { fontSize: 11, color: '#64748B', fontWeight: 'bold' },

  // Términos y Botones finales
  termsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 5 },
  termsText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  mainBtnWrapper: { width: '100%', height: 55, borderRadius: 16, marginTop: 5, overflow: 'hidden' },
  mainBtnModern: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mainBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  // Listado Mis Puntos
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardContent: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  cardSub: { fontSize: 11, color: '#64748B', fontWeight: '500', marginTop: 4 },
  statusMiniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusMiniText: { fontSize: 10, fontWeight: 'bold' },
  vehicleMiniBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  vehicleMiniText: { fontSize: 11, fontWeight: '600' },
  deleteAction: { padding: 8, marginLeft: 5 },

  // Listado de Reservas Recibidas
  reservaCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.02 },
  reservaIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  reservaUser: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 5 },
  reservaInfo: { fontSize: 13, color: '#475569', fontWeight: '500', marginTop: 2 },
  reservaSubInfo: { fontSize: 12, color: '#64748B', marginTop: 2 },
  reservaMonto: { fontSize: 16, fontWeight: '900', color: '#10B981' },
  reservaTime: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#065F46' },
  payResBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  payResText: { fontSize: 10, fontWeight: 'bold' },
  
  // Acciones en Reservas Activas
  adminActionRow: { flexDirection: 'row', gap: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  btnActionEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnActionEditText: { fontSize: 12, color: '#D97706', fontWeight: 'bold' },
  btnActionCancel: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnActionCancelText: { fontSize: 12, color: '#EF4444', fontWeight: 'bold' },

  // Modales Estilos Generales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  profileSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, alignItems: 'center', width: '100%' },
  largeCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  largeLetter: { color: '#FFF', fontSize: 30, fontWeight: 'bold' },
  pName: { fontSize: 20, fontWeight: 'bold' },
  pEmail: { color: '#64748B', marginBottom: 20 },
  menuItem: { flexDirection: 'row', width: '100%', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  closeBtn: { position: 'absolute', top: 20, right: 20 },
  editCard: { backgroundColor: '#FFF', width: '85%', borderRadius: 30, padding: 25, alignItems: 'center' },
  editTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  editInput: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15, color: '#1E293B' },
  saveBtn: { width: '100%', backgroundColor: '#2563EB', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});