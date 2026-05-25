import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; // 🛡️ Importación agregada para solucionar el rebote

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Atención", "Por favor completa todos los campos.");
    
    setLoading(true);
    try {
      const res = await axios.post('http://192.168.1.70:3001/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      // Validamos que el backend haya respondido con éxito
      if (res.data && res.data.success !== false) {
        // Tu backend devuelve el objeto del usuario (ya sea directo o dentro de res.data.usuario)
        const user = res.data.usuario || res.data;

        // 🔑 PASO CRUCIAL: Guardamos las credenciales en el almacenamiento seguro
        await SecureStore.setItemAsync('usuario_email', user.email);
        await SecureStore.setItemAsync('usuario_nombre', user.nombre || 'Usuario');
        
        // Mapeamos el rol del backend para que tu index.tsx lo reconozca perfectamente
        const rolFormateado = (user.rol === 'admin' || user.rol === 'dueño') ? 'dueño' : 'conductor';
        await SecureStore.setItemAsync('usuario_rol', rolFormateado);

        // Redirección inteligente utilizando tus rutas fijas
        if (rolFormateado === 'dueño') {
          router.replace('/admin_panel');
        } else {
          router.replace('/user_panel');
        }
      } else {
        Alert.alert("Error de Acceso", res.data.message || "Los datos no coinciden. Inténtalo de nuevo.");
      }
    } catch (error) {
      console.log("Error en Login:", error);
      Alert.alert("Error de Acceso", "Los datos no coinciden o no hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* BOTÓN VOLVER - ESTILO MINIMALISTA */}
        <TouchableOpacity style={styles.backCircle} onPress={() => router.replace('/')}>
          <Ionicons name="chevron-back" size={24} color="#2563EB" />
        </TouchableOpacity>

        {/* ILUSTRACIÓN O EMOJI CENTRAL */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="car-sport" size={50} color="#2563EB" />
          </View>
        </View>

        <View style={styles.textHeader}>
          <Text style={styles.title}>¡Hola de nuevo!</Text>
          <Text style={styles.subtitle}>Encuentra el lugar perfecto para tu vehículo en Medellín.</Text>
        </View>

        {/* FORMULARIO ESTILO CARD */}
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-unread-outline" size={20} color="#94A3B8" />
              <TextInput 
                style={styles.input} 
                placeholder="tu@correo.com" 
                placeholderTextColor="#CBD5E1"
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONTRASEÑA</Text>
            <View style={styles.inputBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
              <TextInput 
                style={styles.input} 
                placeholder="••••••••" 
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.mainBtn, loading && styles.btnDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.mainBtnText}>ACCEDER AL MAPA</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{marginLeft: 10}} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* FOOTER */}
        <TouchableOpacity 
          style={styles.footerBtn}
          onPress={() => router.push('/register_screen')}
        >
          <Text style={styles.footerText}>
            ¿Nuevo en ParqueaFácil? <Text style={styles.footerLink}>Crea una cuenta</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 25, paddingTop: 60 },
  backCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  iconContainer: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  textHeader: { alignItems: 'center', marginBottom: 35 },
  title: { fontSize: 30, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 20 },
  
  card: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 8, marginLeft: 5, letterSpacing: 1 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  
  mainBtn: {
    backgroundColor: '#2563EB',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8
  },
  btnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  mainBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  
  footerBtn: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#64748B', fontSize: 15 },
  footerLink: { color: '#2563EB', fontWeight: 'bold' }
});