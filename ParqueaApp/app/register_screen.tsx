import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('cliente'); // 'cliente' (Conductor) o 'admin' (Dueño)
  const [codigoAdmin, setCodigoAdmin] = useState(''); // 🔑 Estado para el código secreto
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!nombre || !email || !password) {
      return Alert.alert("Campos vacíos", "Por favor completa toda la información.");
    }

    if (rol === 'admin' && !codigoAdmin) {
      return Alert.alert("Código requerido", "Por favor ingresa el código de acceso secreto para Dueños.");
    }
    
    setLoading(true);
    try {
      await axios.post('http://192.168.1.70:3001/registro', { 
        nombre: nombre.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        rol,
        codigo_admin: rol === 'admin' ? codigoAdmin.trim() : undefined
      });
      
      Alert.alert("¡Bienvenido!", `Tu cuenta de ${rol === 'cliente' ? 'Conductor' : 'Dueño'} ha sido creada.`);
      router.replace('/login_screen');
    } catch (e: any) {
      const msgError = e.response?.data?.error || "No pudimos crear la cuenta. Intenta con otro correo.";
      Alert.alert("Error de registro", msgError);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    // 🛡️ SafeAreaView envuelve todo para proteger los bordes de la barra de notificaciones del celular
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        {/* ⬅️ Botón flotante para volver atrás con posición cómoda relativa */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Crea tu Cuenta</Text>
            <Text style={styles.subtitle}>Regístrate en ParqueaFácil para empezar</Text>
          </View>

          <View style={styles.form}>
            {/* Campo Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.icon} />
                <TextInput style={styles.input} placeholder="Juan Pérez" value={nombre} onChangeText={setNombre} />
              </View>
            </View>

            {/* Campo Correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.icon} />
                <TextInput style={styles.input} placeholder="ejemplo@correo.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.icon} />
                <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
              </View>
            </View>

            {/* Selector de Roles */}
            <Text style={styles.roleTitle}>¿Cómo usarás la aplicación?</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity style={[styles.roleCard, rol === 'cliente' && styles.roleActive]} onPress={() => setRol('cliente')}>
                <Ionicons name="car-outline" size={32} color={rol === 'cliente' ? '#FFF' : '#64748B'} />
                <Text style={[styles.roleText, rol === 'cliente' && styles.roleTextActive]}>Conductor</Text>
                {rol === 'cliente' && <Ionicons name="checkmark-circle" size={18} color="#FFF" style={styles.checkIcon} />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.roleCard, rol === 'admin' && styles.roleActive]} onPress={() => setRol('admin')}>
                <Ionicons name="business-outline" size={32} color={rol === 'admin' ? '#FFF' : '#64748B'} />
                <Text style={[styles.roleText, rol === 'admin' && styles.roleTextActive]}>Dueño</Text>
                {rol === 'admin' && <Ionicons name="checkmark-circle" size={18} color="#FFF" style={styles.checkIcon} />}
              </TouchableOpacity>
            </View>

            {/* 🔑 Campo Condicional para Código Secreto */}
            {rol === 'admin' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código de Acceso Dueño</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#94A3B8" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa el código de verificación"
                    secureTextEntry
                    autoCapitalize="none"
                    value={codigoAdmin}
                    onChangeText={setCodigoAdmin}
                  />
                </View>
                {/* ℹ️ Texto de Soporte informativo abajo del cuadro */}
                <View style={styles.supportContainer}>
                  <Ionicons name="chatbox-ellipses-outline" size={14} color="#64748B" />
                  <Text style={styles.supportText}>
                    Para solicitar código comunicarse con soporte
                  </Text>
                </View>
              </View>
            )}

            {/* Botón de Enviar */}
            <TouchableOpacity style={styles.btnRegister} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnRegisterText}>REGISTRARSE</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLoginLink} onPress={() => router.replace('/login_screen')}>
              <Text style={styles.loginLinkText}>¿Ya tienes cuenta? <Text style={{fontWeight: '700', color: '#2563EB'}}>Inicia Sesión</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' }, // Fondo limpio detrás de la barra nativa
  container: { flex: 1 },
  backButton: { 
    position: 'absolute', 
    top: 15, // Bajado sutilmente para que no choque jamás con la barra superior
    left: 20, 
    zIndex: 10, 
    backgroundColor: '#FFF', 
    padding: 10, 
    borderRadius: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  scrollContainer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 75, alignItems: 'center' }, // Se ajustó el padding superior para dar un espaciado cómodo respetando la flecha atrás
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 5 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 15 },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1E293B' },
  roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 10, marginBottom: 15, textAlign: 'center' },
  roleContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  roleCard: { flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', position: 'relative' },
  roleActive: { backgroundColor: '#2563EB', borderColor: '#2563EB', elevation: 4 },
  roleText: { marginTop: 8, fontWeight: 'bold', color: '#64748B' },
  roleTextActive: { color: '#FFF' },
  checkIcon: { position: 'absolute', top: 10, right: 10 },
  supportContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingLeft: 6 },
  supportText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  btnRegister: { backgroundColor: '#2563EB', width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15, elevation: 2 },
  btnRegisterText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  btnLoginLink: { marginTop: 25, alignItems: 'center' },
  loginLinkText: { color: '#64748B', fontSize: 14 }
});