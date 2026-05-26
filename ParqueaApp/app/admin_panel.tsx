import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Dimensions, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Modal, StatusBar, Image, RefreshControl } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
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
  horas_reservadas: number;
  total_pago: number;
  metodo_pago: string;
  created_at: string;
  estado: 'activa' | 'cancelada' | 'completada' | string;
  parqueaderos?: {
    nombre: string;
  };
}

export default function AdminPanel() {
  const router = useRouter();
  
  // Estados de sesión y edición de perfil
  const [userData, setUserData] = useState({ nombre: '', email: '' });
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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

  useEffect(() => {
    const verificarSesionAdmin = async () => {
      try {
        const email = await SecureStore.getItemAsync('usuario_email');
        const nombre = await SecureStore.getItemAsync('usuario_nombre');
        const rol = await SecureStore.getItemAsync('usuario_rol');

        if (email && nombre && (rol === 'admin' || rol === 'dueno' || rol === 'cliente')) { 
          setUserData({ email, nombre });
          setEditNombre(nombre);
          setEditEmail(email);
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

  const cargarMisDatosPropios = useCallback(async (emailTarget: string) => {
    if (!emailTarget || emailTarget.trim() === '' || emailTarget === 'undefined') return;

    setLoading(true);
    try {
      const resPuntos = await axios.get(`http://192.168.1.70:3001/mis-parqueaderos/${emailTarget.trim()}`);
      const resReservas = await axios.get(`http://192.168.1.70:3001/mis-reservas/${emailTarget.trim()}`);
      
      setParqueaderos(resPuntos.data);
      setReservas(resReservas.data);
    } catch (error: any) {
      console.log("Error en sincronización:", error.response?.data);
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

  // Guardar Cambios del Perfil
  const handleUpdateProfile = async () => {
    if (!editNombre.trim() || !editEmail.trim()) {
      return Alert.alert("Error", "Los campos de perfil no pueden estar vacíos.");
    }

    try {
      setLoading(true);
      // Petición PUT al servidor para actualizar la información del administrador
      const res = await axios.put(`http://192.168.1.70:3001/usuarios/actualizar`, {
        emailActual: userData.email, // Llave para buscar en la BD
        nuevoNombre: editNombre.trim(),
        nuevoEmail: editEmail.trim()
      });

      if (res.data.success) {
        // Actualizar almacenamiento local nativo persistente
        await SecureStore.setItemAsync('usuario_nombre', editNombre.trim());
        await SecureStore.setItemAsync('usuario_email', editEmail.trim());
        
        setUserData({ nombre: editNombre.trim(), email: editEmail.trim() });
        setIsEditingProfile(false);
        setProfileModal(false);
        Alert.alert("Éxito", "Perfil actualizado correctamente.");
        
        // Volver a cargar los datos en base al nuevo email asignado
        cargarMisDatosPropios(editEmail.trim());
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.error || "No se pudo actualizar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtenderReserva = async (reservaId: number) => {
    try {
      const res = await axios.post(`http://192.168.1.70:3001/extender-reserva/${reservaId}`);
      if (res.data.success) {
        Alert.alert("Éxito", "Tiempo extendido +1 Hora.");
        cargarMisDatosPropios(userData.email);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo extender el tiempo.");
    }
  };

  const handleCancelarReserva = async (reservaId: number) => {
    Alert.alert("Cancelar Reserva", "¿Liberar celdas inmediatamente?", [
      { text: "Volver", style: "cancel" },
      { text: "Sí, Cancelar", style: "destructive", onPress: async () => {
        try {
          await axios.post(`http://192.168.1.70:3001/cancelar-reserva/${reservaId}`);
          cargarMisDatosPropios(userData.email);
        } catch (e) { Alert.alert("Error", "No se canceló."); }
      }}
    ]);
  };

  const handleBorrarReserva = async (reservaId: number) => {
    Alert.alert("Eliminar permanentemente", "¿Borrar registro del historial?", [
      { text: "Conservar", style: "cancel" },
      { text: "Borrar", style: "destructive", onPress: async () => {
        try {
          await axios.delete(`http://192.168.1.70:3001/borrar-reserva/${reservaId}`);
          cargarMisDatosPropios(userData.email);
        } catch (e) { Alert.alert("Error", "No se eliminó."); }
      }}
    ]);
  };

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

  const handlePublish = async () => {
    if (!nombre || !cupos || !precio) return Alert.alert("Campos incompletos");
    try {
      setLoading(true);
      await axios.post('http://192.168.1.70:3001/parqueaderos', {
        nombre, cupos_totales: parseInt(cupos), cupos_disponibles: parseInt(cupos),
        precio: parseFloat(precio), lat: location.latitude, lng: location.longitude,
        direccion: "Ubicación Administrador", metodo_pago: metodosSeleccionados.join(','),
        fotos, estado_operacion: 'abierto', tipo_vehiculo: tipoVehiculo, admin_email: userData.email 
      });
      setModalVisible(false);
      setNombre(''); setCupos(''); setPrecio(''); setFotos([]);
      cargarMisDatosPropios(userData.email);
    } catch (e) { Alert.alert("Error al guardar punto"); }
    finally { setLoading(false); }
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
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingTxt}>Sincronizando consola ejecutiva...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER PREMIUM */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Panel de Control</Text>
          <Text style={styles.adminName}>{userData.nombre}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => {  setIsEditingProfile(false); setProfileModal(true); }}>
          <Image source={{ uri: `https://ui-avatars.com/api/?name=${userData.nombre}&background=4F46E5&color=fff&size=120` }} style={styles.avatarImg} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
      >
        {/* MÉTRICAS MODERNAS */}
        <Text style={styles.sectionTitle}>Métricas Globales</Text>
        <View style={styles.metricsContainer}>
          <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.metricCard}>
            <Ionicons name="business" size={22} color="#FFF" style={styles.metricIconBg} />
            <Text style={styles.metricVal}>{parqueaderos.length}</Text>
            <Text style={styles.metricSub}>Mis Puntos</Text>
          </LinearGradient>
          
          <LinearGradient colors={['#065F46', '#10B981']} style={styles.metricCard}>
            <Ionicons name="calendar-clear" size={22} color="#FFF" style={styles.metricIconBg} />
            <Text style={styles.metricVal}>{reservas.length}</Text>
            <Text style={styles.metricSub}>Reservas Hoy</Text>
          </LinearGradient>
        </View>

        {/* ÚLTIMAS RESERVAS */}
        <Text style={styles.sectionTitle}>Últimas Reservas Recibidas</Text>
        {reservas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>Sin movimientos o solicitudes activas en tus terminales.</Text>
          </View>
        ) : (
          reservas.map((r) => {
            const esActiva = r.estado === 'activa';
            return (
              <View key={r.id} style={styles.resCard}>
                <View style={styles.resHeader}>
                  <View style={styles.clientMetaBlock}>
                    <Ionicons name="person" size={14} color="#64748B" />
                    <Text style={styles.resCliente}>{r.usuario_nombre}</Text>
                  </View>
                  <View style={[styles.resStateBadge, r.estado === 'activa' ? styles.badgeActiva : r.estado === 'completada' ? styles.badgeCompletada : styles.badgeCancelada]}>
                    <Text style={[styles.resStateBadgeText, r.estado === 'activa' ? styles.textActiva : r.estado === 'completada' ? styles.textCompletada : styles.textCancelada]}>
                      {(r.estado || 'activa').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.resLugar}>{r.parqueaderos?.nombre || 'Mi Parqueadero'}</Text>
                
                <View style={styles.resMetaRow}>
                  <View style={styles.metaBadge}><Text style={styles.metaBadgeTxt}>🚗 {(r.vehiculo_tipo || 'carro').toUpperCase()}</Text></View>
                  <View style={styles.metaBadge}><Text style={styles.metaBadgeTxt}>⏱️ {r.horas_reservadas}h</Text></View>
                  <Text style={styles.resMonto}>${r.total_pago.toLocaleString()}</Text>
                </View>

                {/* BOTONERA DE ACCIÓN GESTIÓN */}
                <View style={styles.adminActionsContainer}>
                  {esActiva && (
                    <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, styles.btnExtender]} onPress={() => handleExtenderReserva(r.id)}>
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.btnActionText}>+1 Hora</Text>
                    </TouchableOpacity>
                  )}

                  {esActiva && (
                    <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, styles.btnCancelar]} onPress={() => handleCancelarReserva(r.id)}>
                      <Ionicons name="close-circle-outline" size={16} color="#4B5563" />
                      <Text style={[styles.btnActionText, {color: '#4B5563'}]}>Cancelar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, styles.btnBorrar]} onPress={() => handleBorrarReserva(r.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* MIS PARQUEADEROS */}
        <Text style={styles.sectionTitle}>Mis Puntos de Parqueo</Text>
        {parqueaderos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="storefront-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>Registra tu primer punto comercial en el botón inferior.</Text>
          </View>
        ) : (
          parqueaderos.map((p) => (
            <View key={p.id} style={styles.pCard}>
              <View style={styles.pCardHeader}>
                <Text style={styles.pCardTitle}>{p.nombre}</Text>
                <View style={[styles.pBadge, { backgroundColor: p.estado_operacion === 'abierto' ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.pBadgeText, { color: p.estado_operacion === 'abierto' ? '#065F46' : '#991B1B' }]}>
                    {p.estado_operacion === 'abierto' ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.pCardMetricsRow}>
                <View style={styles.pCardMetricBox}>
                  <Text style={styles.pMetricLabel}>PRECIO / HORA</Text>
                  <Text style={styles.pMetricVal}>${p.precio.toLocaleString()}</Text>
                </View>
                <View style={styles.pCardMetricBox}>
                  <Text style={styles.pMetricLabel}>CUPOS DISPONIBLES</Text>
                  <Text style={styles.pMetricVal}>{p.cupos_disponibles} <Text style={{fontSize:12, color:'#94A3B8'}}>/{p.cupos_totales}</Text></Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ACCIÓN PRINCIPAL FLOTANTE */}
      <View style={styles.absoluteBlurContainer}>
        <LinearGradient colors={['rgba(248,250,252,0)', '#F8FAFC']} style={styles.gradientBlur} />
        <TouchableOpacity activeOpacity={0.9} style={styles.btnMainAction} onPress={() => setModalVisible(true)}>
          <LinearGradient colors={['#4F46E5', '#3730A3']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.gradientBtn}>
            <Ionicons name="add" size={24} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.btnMainActionText}>REGISTRAR NUEVO PARQUEADERO</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MODAL: FORMULARIO REGISTRO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Establecimiento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={28} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              <Text style={styles.inputLabel}>Nombre Comercial</Text>
              <TextInput style={styles.modalInput} placeholder="Ej: Central Station Parking" placeholderTextColor="#94A3B8" value={nombre} onChangeText={setNombre} />

              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cupos Totales</Text>
                  <TextInput style={styles.modalInput} placeholder="30" keyboardType="numeric" placeholderTextColor="#94A3B8" value={cupos} onChangeText={setCupos} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio por Hora</Text>
                  <TextInput style={styles.modalInput} placeholder="4000" keyboardType="numeric" placeholderTextColor="#94A3B8" value={precio} onChangeText={setPrecio} />
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

              <Text style={styles.inputLabel}>Carga de Evidencia Fotográfica</Text>
              <TouchableOpacity style={styles.btnImagePick} onPress={pickImage}>
                <Ionicons name="image-outline" size={20} color="#4F46E5" />
                <Text style={styles.btnImagePickText}>Importar desde Galería</Text>
              </TouchableOpacity>

              {fotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, flexDirection: 'row' }}>
                  {fotos.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.previewImage} />
                  ))}
                </ScrollView>
              )}

              <Text style={styles.inputLabel}>Geolocalización del Punto</Text>
              <View style={styles.mapContainer}>
                <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={location} onRegionChangeComplete={(r) => setLocation({ ...r, latitudeDelta: 0.009, longitudeDelta: 0.009 })} />
                <View style={styles.markerFixed}><Ionicons name="location" size={38} color="#EF4444" /></View>
              </View>

              <TouchableOpacity style={styles.btnSubmit} onPress={handlePublish}>
                <Text style={styles.btnSubmitText}>PUBLICAR ESTABLECIMIENTO</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL: PERFIL / EDICIÓN COMPLETA */}
      <Modal visible={profileModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlayCenter}>
          <View style={styles.profileCard}>
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>{isEditingProfile ? "Editar Perfil" : "Mi Perfil"}</Text>
              <TouchableOpacity onPress={() => { setProfileModal(false); setIsEditingProfile(false); }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Image source={{ uri: `https://ui-avatars.com/api/?name=${userData.nombre}&background=4F46E5&color=fff&size=150` }} style={styles.profileAvatarLarge} />
            
            {!isEditingProfile ? (
              // Vista Normal del Perfil
              <View style={styles.profileInfoContent}>
                <Text style={styles.profName}>{userData.nombre}</Text>
                <Text style={styles.profEmail}>{userData.email}</Text>
                
                <TouchableOpacity style={styles.btnEditTrigger} onPress={() => setIsEditingProfile(true)}>
                  <Ionicons name="create-outline" size={16} color="#4F46E5" />
                  <Text style={styles.btnEditTriggerText}>Modificar Datos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Formulario Interactivo de Edición
              <View style={styles.profileFormContent}>
                <Text style={styles.miniLabel}>Nombre Completo</Text>
                <TextInput style={styles.profileInput} value={editNombre} onChangeText={setEditNombre} placeholder="Tu nombre" placeholderTextColor="#94A3B8" />

                <Text style={styles.miniLabel}>Correo Electrónico</Text>
                <TextInput style={styles.profileInput} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" placeholder="tu@email.com" placeholderTextColor="#94A3B8" />

                <View style={styles.profileRowButtons}>
                  <TouchableOpacity style={[styles.profileSubBtn, styles.btnCancelEdit]} onPress={() => { setIsEditingProfile(false); setEditNombre(userData.nombre); setEditEmail(userData.email); }}>
                    <Text style={styles.textCancelEdit}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.profileSubBtn, styles.btnSaveEdit]} onPress={handleUpdateProfile}>
                    <Text style={styles.textSaveEdit}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.btnLogoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerMode: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingTxt: { marginTop: 12, fontSize: 14, color: '#475569', fontWeight: '600' },
  
  // Header Moderno
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 35, paddingBottom: 20, backgroundColor: '#FFF' },
  welcomeText: { fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  adminName: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0' },
  profileBtn: { padding: 2 },
  
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: 24, marginBottom: 14, paddingHorizontal: 4 },
  
  // Métricas
  metricsContainer: { flexDirection: 'row', gap: 14 },
  metricCard: { flex: 1, padding: 18, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  metricIconBg: { position: 'absolute', bottom: -10, right: -6, opacity: 0.18, fontSize: 75 },
  metricVal: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  metricSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },

  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginTop: 4 },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 10, paddingHorizontal: 20, lineHeight: 18 },
  
  // Tarjetas de Reserva
  resCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F6', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 2 },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clientMetaBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resCliente: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  resLugar: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  resMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  metaBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  metaBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },
  resMonto: { fontSize: 17, fontWeight: '900', color: '#10B981', marginLeft: 'auto' },
  
  // Badges Dinámicos Reserva
  resStateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActiva: { backgroundColor: '#ECFDF5' },
  badgeCancelada: { backgroundColor: '#FEF2F2' },
  badgeCompletada: { backgroundColor: '#F8FAFC' },
  resStateBadgeText: { fontSize: 11, fontWeight: '800' },
  textActiva: { color: '#059669' },
  textCancelada: { color: '#EF4444' },
  textCompletada: { color: '#64748B' },

  // Botonera Interna Control Admin
  adminActionsContainer: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, marginRight: 8 },
  btnExtender: { backgroundColor: '#4F46E5', flex: 1.3 },
  btnCancelar: { backgroundColor: '#F1F5F9', flex: 1 },
  btnBorrar: { backgroundColor: '#FEF2F2', width: 42, marginRight: 0 },
  btnActionText: { color: '#FFF', fontSize: 12, fontWeight: '800', marginLeft: 4 },

  // Tarjetas Mis Parqueaderos
  pCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F6' },
  pCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pCardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  pBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pBadgeText: { fontSize: 11, fontWeight: '700' },
  pCardMetricsRow: { flexDirection: 'row', gap: 20, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16 },
  pCardMetricBox: { flex: 1 },
  pMetricLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  pMetricVal: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },

  // Botón Flotante Fijo Inferior
  absoluteBlurContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingTop: 20 },
  gradientBlur: { ...StyleSheet.absoluteFillObject },
  btnMainAction: { height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: '#4F46E5', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 4 },
  gradientBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnMainActionText: { color: '#FFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.6 },

  // Modales Estilizados
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingVertical: 24, maxHeight: height * 0.88 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15, color: '#0F172A' },
  rowSelector: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  selectorBtn: { flex: 1, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  selectorActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  selectorBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  selectorActiveText: { color: '#FFF' },
  btnImagePick: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2F6', borderRadius: 14, padding: 14, justifyContent: 'center', marginVertical: 4 },
  btnImagePickText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
  previewImage: { width: 75, height: 75, borderRadius: 12, marginRight: 8 },
  mapContainer: { width: '100%', height: 170, borderRadius: 20, overflow: 'hidden', marginTop: 4, position: 'relative' },
  map: { width: '100%', height: '100%' },
  markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -19, marginTop: -35, alignItems: 'center', justifyContent: 'center' },
  btnSubmit: { backgroundColor: '#10B981', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  btnSubmitText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  
  // Elementos del Modal de Perfil con Edición Incorporada
  profileCard: { backgroundColor: '#FFF', width: '85%', borderRadius: 28, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  profileModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
  profileModalTitle: { fontSize: 15, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  profileAvatarLarge: { width: 70, height: 70, borderRadius: 35, marginBottom: 12, borderWidth: 2, borderColor: '#EEF2F6' },
  profileInfoContent: { width: '100%', alignItems: 'center' },
  profName: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  profEmail: { fontSize: 13, color: '#64748B', marginTop: 3, marginBottom: 12, textAlign: 'center' },
  btnEditTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  btnEditTriggerText: { color: '#4F46E5', fontSize: 13, fontWeight: '700' },
  
  // Formulario Interno Edición
  profileFormContent: { width: '100%', marginTop: 5 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 5, textTransform: 'uppercase' },
  profileInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A', marginBottom: 12 },
  profileRowButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  profileSubBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  btnCancelEdit: { backgroundColor: '#F1F5F9' },
  textCancelEdit: { color: '#475569', fontWeight: '700', fontSize: 13 },
  btnSaveEdit: { backgroundColor: '#4F46E5' },
  textSaveEdit: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  btnLogout: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  btnLogoutText: { color: '#EF4444', fontWeight: '700', fontSize: 14 }
});