import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Modal, StatusBar, Image, RefreshControl, Switch } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store'; 
import * as ImagePicker from 'expo-image-picker'; 

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
  parqueaderos?: {
    nombre: string;
  };
}

export default function AdminPanel() {
  const router = useRouter();
  
  const [userData, setUserData] = useState({ nombre: '', email: '' });
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const [parqueaderos, setParqueaderos] = useState<Parqueadero[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Formulario y Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cupos, setCupos] = useState('');
  const [precio, setPrecio] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState<'carro' | 'moto' | 'ambos'>('ambos');
  const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>(['Efectivo']);
  const [fotos, setFotos] = useState<string[]>([]); 
  
  const [location, setLocation] = useState({
    latitude: 6.2442,
    longitude: -75.5812,
    latitudeDelta: 0.009,
    longitudeDelta: 0.009,
  });

  // 1. Cargar Sesión nativa y validar Rol
  useEffect(() => {
    const verificarSesionAdmin = async () => {
      try {
        const email = await SecureStore.getItemAsync('usuario_email');
        const nombre = await SecureStore.getItemAsync('usuario_nombre');
        const rol = await SecureStore.getItemAsync('usuario_rol');

        if (email && nombre && (rol === 'admin' || rol === 'dueno' || rol === 'cliente')) { 
          setUserData({ email, nombre });
          setSessionLoaded(true);
        } else {
          Alert.alert("Acceso denegado", "Sesión inválida o expirada.");
          router.replace('/login_screen');
        }
      } catch (e) {
        router.replace('/login_screen');
      }
    };
    verificarSesionAdmin();
  }, []);

  // 2. Traer registros específicos vinculados (Blindado contra Error 400)
  const cargarMisDatosPropios = useCallback(async (emailTarget: string) => {
    // 🛡️ Filtro de seguridad: Si viene nulo o vacío frena la petición antes del error
    if (!emailTarget || emailTarget.trim() === '' || emailTarget === 'undefined') {
      console.log("Sincronización pausada: Esperando email del usuario válido.");
      return; 
    }

    setLoading(true);
    try {
      const resPuntos = await axios.get(`http://192.168.1.70:3001/mis-parqueaderos/${emailTarget.trim()}`);
      const resReservas = await axios.get(`http://192.168.1.70:3001/mis-reservas/${emailTarget.trim()}`);
      
      setParqueaderos(resPuntos.data);
      setReservas(resReservas.data);
    } catch (error: any) {
      const servidorError = error.response?.data?.error || error.response?.data || error.message;
      console.log("Detalle técnico del error en sincronización:", error.response?.data);
      Alert.alert("Error de Conexión", `Detalle del Servidor: ${servidorError}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoaded && userData.email) {
      cargarMisDatosPropios(userData.email);
    }
  }, [sessionLoaded, userData.email, cargarMisDatosPropios]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (userData.email) await cargarMisDatosPropios(userData.email);
    setRefreshing(false);
  };

  // Funcionalidad para seleccionar imágenes de la galería
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setFotos([...fotos, result.assets[0].uri]);
    }
  };

  // 3. Crear Parqueadero usando 'admin_email'
  const handlePublish = async () => {
    if (!nombre || !cupos || !precio) {
      return Alert.alert("Campos incompletos", "Por favor completa la información básica del punto.");
    }

    try {
      setLoading(true);
      await axios.post('http://192.168.1.70:3001/parqueaderos', {
        nombre,
        cupos_totales: parseInt(cupos),
        cupos_disponibles: parseInt(cupos),
        precio: parseFloat(precio),
        lat: location.latitude,
        lng: location.longitude,
        direccion: "Coordenadas Administrador",
        metodo_pago: metodosSeleccionados.join(','),
        fotos: fotos,
        estado_operacion: 'abierto',
        tipo_vehiculo: tipoVehiculo,
        admin_email: userData.email // 🛠️ Sincronizado exactamente con tu BD
      });

      Alert.alert("Éxito", "Tu parqueadero ha sido publicado correctamente.");
      setModalVisible(false);
      setNombre(''); setCupos(''); setPrecio(''); setFotos([]);
      cargarMisDatosPropios(userData.email);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || "Error desconocido";
      Alert.alert("Error del Servidor", `Detalle: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('usuario_email');
    await SecureStore.deleteItemAsync('usuario_nombre');
    await SecureStore.deleteItemAsync('usuario_rol');
    setProfileModal(false);
    router.replace('/login_screen');
  };

  const toggleMetodo = (metodo: string) => {
    if (metodosSeleccionados.includes(metodo)) {
      if (metodosSeleccionados.length > 1) {
        setMetodosSeleccionados(metodosSeleccionados.filter(m => m !== metodo));
      }
    } else {
      setMetodosSeleccionados([...metodosSeleccionados, metodo]);
    }
  };

  if (!sessionLoaded || (loading && !refreshing)) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: '#64748B' }}>Cargando panel de control corporativo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <LinearGradient colors={['#FFF', '#F8FAFC']} style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Panel Administrativo</Text>
          <Text style={styles.adminName}>{userData.nombre || 'Cargando...'}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => setProfileModal(true)}>
          <Ionicons name="person-circle" size={36} color="#2563EB" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#2563EB']} // Array correcto
            tintColor="#2563EB"  // iOS compatible
          />
        }
      >
        {/* MÉTRICAS */}
        <Text style={styles.sectionTitle}>Métricas Propias</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Ionicons name="business" size={24} color="#2563EB" />
            <Text style={styles.metricVal}>{parqueaderos.length}</Text>
            <Text style={styles.metricSub}>Mis Puntos</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="calendar" size={24} color="#10B981" />
            <Text style={styles.metricVal}>{reservas.length}</Text>
            <Text style={styles.metricSub}>Reservas</Text>
          </View>
        </View>

        {/* ACCION PRINCIPAL */}
        <TouchableOpacity style={styles.btnMainAction} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnMainActionText}>REGISTRAR NUEVO PARQUEADERO</Text>
        </TouchableOpacity>

        {/* MIS PARQUEADEROS */}
        <Text style={styles.sectionTitle}>Mis Puntos de Parqueo</Text>
        {parqueaderos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aún no has registrado parqueaderos bajo tu cuenta.</Text>
          </View>
        ) : (
          parqueaderos.map((p) => (
            <View key={p.id} style={styles.pCard}>
              <View style={styles.pCardHeader}>
                <Text style={styles.pCardTitle}>{p.nombre}</Text>
                <View style={[styles.badge, { backgroundColor: p.estado_operacion === 'abierto' ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[styles.badgeText, { color: p.estado_operacion === 'abierto' ? '#15803D' : '#B91C1C' }]}>
                    {(p.estado_operacion || '').toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.pCardDetail}>Precio/Hora: <Text style={{fontWeight: '700'}}>${p.precio}</Text></Text>
              <Text style={styles.pCardDetail}>Cupos: <Text style={{fontWeight: '700'}}>{p.cupos_disponibles}/{p.cupos_totales}</Text></Text>
              <Text style={styles.pCardDetail}>Admite: <Text style={{fontWeight: '700', color: '#475569'}}>{(p.tipo_vehiculo || 'ambos').toUpperCase()}</Text></Text>
            </View>
          ))
        )}

        {/* ÚLTIMAS RESERVAS */}
        <Text style={styles.sectionTitle}>Últimas Reservas Recibidas</Text>
        {reservas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No registras movimientos recientes en tus puntos.</Text>
          </View>
        ) : (
          reservas.map((r) => (
            <View key={r.id} style={styles.resCard}>
              <View style={styles.resHeader}>
                <Text style={styles.resLugar}>{r.parqueaderos?.nombre || 'Mi Parqueadero'}</Text>
                <Text style={styles.resMonto}>${r.total_pago}</Text>
              </View>
              <Text style={styles.resCliente}>Cliente: {r.usuario_nombre} ({r.usuario_email})</Text>
              <View style={styles.resMetaRow}>
                <Text style={styles.resMeta}>🚗 {(r.vehiculo_tipo || 'carro').toUpperCase()}</Text>
                <Text style={styles.resMeta}>⏱️ {r.horas_reservadas}h</Text>
                <Text style={styles.resMeta}>📥 {new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL: FORMULARIO REGISTRO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Punto</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre Comercial</Text>
              <TextInput style={styles.modalInput} placeholder="Ej: Parqueadero Central" value={nombre} onChangeText={setNombre} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cupos Totales</Text>
                  <TextInput style={styles.modalInput} placeholder="20" keyboardType="numeric" value={cupos} onChangeText={setCupos} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio por Hora</Text>
                  <TextInput style={styles.modalInput} placeholder="3500" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Vehículos Permitidos</Text>
              <View style={styles.rowSelector}>
                {(['carro', 'moto', 'ambos'] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.selectorBtn, tipoVehiculo === t && styles.selectorActive]} onPress={() => setTipoVehiculo(t)}>
                    <Text style={[styles.selectorBtnText, tipoVehiculo === t && styles.selectorActiveText]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Métodos de Pago</Text>
              <View style={styles.rowSelector}>
                {['Efectivo', 'Nequi', 'Bancolombia'].map((m) => {
                  const active = metodosSeleccionados.includes(m);
                  return (
                    <TouchableOpacity key={m} style={[styles.selectorBtn, active && styles.selectorActive]} onPress={() => toggleMetodo(m)}>
                      <Text style={[styles.selectorBtnText, active && styles.selectorActiveText]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* CARGA DE FOTOS */}
              <Text style={styles.inputLabel}>Fotos del Establecimiento</Text>
              <TouchableOpacity style={styles.btnImagePick} onPress={pickImage}>
                <Ionicons name="camera-outline" size={20} color="#2563EB" />
                <Text style={styles.btnImagePickText}>Añadir Imagen desde Galería</Text>
              </TouchableOpacity>

              {fotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                  {fotos.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.previewImage} />
                  ))}
                </ScrollView>
              )}

              <Text style={styles.inputLabel}>Arrastra el Mapa para Ubicar el Punto</Text>
              <View style={styles.mapContainer}>
                <MapView 
                  provider={PROVIDER_GOOGLE} 
                  style={styles.map} 
                  initialRegion={location}
                  onRegionChangeComplete={(r) => setLocation({ ...r, latitudeDelta: 0.009, longitudeDelta: 0.009 })}
                />
                <View style={styles.markerFixed}>
                  <Ionicons name="location" size={40} color="#EF4444" />
                </View>
              </View>

              <TouchableOpacity style={styles.btnSubmit} onPress={handlePublish}>
                <Text style={styles.btnSubmitText}>CONFIRMAR Y PUBLICAR</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL: PERFIL / DESCONEXIÓN */}
      <Modal visible={profileModal} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setProfileModal(false)}>
          <View style={styles.profileCard} onStartShouldSetResponder={() => true}>
            <Ionicons name="person-circle" size={70} color="#2563EB" />
            <Text style={styles.profName}>{userData.nombre || 'Administrador'}</Text>
            <Text style={styles.profEmail}>{userData.email || 'correo@sistema.com'}</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.btnLogoutText}>Cerrar Sesión Activa</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerMode: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  welcomeText: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  adminName: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  profileBtn: { padding: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 25, marginBottom: 12 },
  metricsContainer: { flexDirection: 'row', gap: 15 },
  metricCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  metricVal: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginVertical: 4 },
  metricSub: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  btnMainAction: { backgroundColor: '#2563EB', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 20, elevation: 2 },
  btnMainActionText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  emptyCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  pCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  pCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  pCardDetail: { fontSize: 13, color: '#64748B', marginTop: 3 },
  resCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resLugar: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  resMonto: { fontSize: 15, fontWeight: 'bold', color: '#10B981' },
  resCliente: { fontSize: 13, color: '#475569', marginBottom: 8 },
  resMetaRow: { flexDirection: 'row', gap: 15 },
  resMeta: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: height * 0.85 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 6 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B' },
  rowSelector: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  selectorBtn: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  selectorActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  selectorBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
  selectorActiveText: { color: '#FFF' },
  btnImagePick: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, justifyContent: 'center', marginVertical: 4 },
  btnImagePickText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
  previewImage: { width: 70, height: 70, borderRadius: 10, marginRight: 8 },
  mapContainer: { width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginTop: 6, position: 'relative' },
  map: { width: '100%', height: '100%' },
  markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -35, alignItems: 'center', justifyContent: 'center' },
  btnSubmit: { backgroundColor: '#10B981', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 25, marginBottom: 15 },
  btnSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  profileCard: { backgroundColor: '#FFF', width: '80%', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 5 },
  profName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 10 },
  profEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  divider: { width: '100%', height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
  btnLogout: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  btnLogoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 }
});