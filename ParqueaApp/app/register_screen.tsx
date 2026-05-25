import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('cliente'); // 'cliente' (Conductor) por defecto
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!nombre || !email || !password) return Alert.alert("Campos vacíos", "Por favor completa toda la información.");
    
    setLoading(true);
    try {
      // Usamos tu endpoint con la IP fija
      await axios.post('http://192.168.1.70:3001/registro', { 
        nombre: nombre.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        rol 
      });
      
      Alert.alert("¡Bienvenido!", `Tu cuenta de ${rol === 'cliente' ? 'Conductor' : 'Dueño'} ha sido creada.`);
      router.replace('/login_screen');
    } catch (e) {
      Alert.alert("Error de registro", "No pudimos crear la cuenta. Intenta con otro correo.");
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
        
        {/* BOTÓN VOLVER */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>Únete a la red de parqueaderos más grande de Medellín.</Text>
        </View>

        <View style={styles.form}>
          {/* INPUT NOMBRE */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre Completo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Juan Pérez" onChangeText={setNombre} />
            </View>
          </View>

          {/* INPUT EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="juan@ejemplo.com" 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* INPUT PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.icon} />
              <TextInput 
                style={styles.input} 
                placeholder="Mínimo 6 caracteres" 
                secureTextEntry 
                onChangeText={setPassword} 
              />
            </View>
          </View>

          {/* SELECTOR DE ROL ESTILIZADO */}
          <Text style={styles.roleTitle}>¿Cuál será tu función?</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleCard, rol === 'cliente' && styles.roleActive]} 
              onPress={() => setRol('cliente')}
            >
              <Ionicons name="car-sport" size={28} color={rol === 'cliente' ? '#FFF' : '#64748B'} />
              <Text style={[styles.roleText, rol === 'cliente' && styles.roleTextActive]}>Conductor</Text>
              {rol === 'cliente' && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={styles.checkIcon} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.roleCard, rol === 'admin' && styles.roleActive]} 
              onPress={() => setRol('admin')}
            >
              <Ionicons name="business" size={26} color={rol === 'admin' ? '#FFF' : '#64748B'} />
              <Text style={[styles.roleText, rol === 'admin' && styles.roleTextActive]}>Dueño</Text>
              {rol === 'admin' && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={styles.checkIcon} />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.mainBtn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.mainBtnText}>REGISTRARME AHORA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login_screen')} style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? <Text style={styles.footerLink}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 25, paddingTop: 50 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
  header: { marginBottom: 30 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#64748B', marginTop: 5 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 15 },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1E293B' },
  
  roleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginTop: 10, marginBottom: 15, textAlign: 'center' },
  roleContainer: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  roleCard: { flex: 1, backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', position: 'relative' },
  roleActive: { backgroundColor: '#2563EB', borderColor: '#2563EB', elevation: 4 },
  roleText: { marginTop: 8, fontWeight: 'bold', color: '#64748B' },
  roleTextActive: { color: '#FFF' },
  checkIcon: { position: 'absolute', top: 10, right: 10 },

  mainBtn: { backgroundColor: '#2563EB', padding: 20, borderRadius: 18, alignItems: 'center', elevation: 5, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 10 },
  mainBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  footer: { marginTop: 25, marginBottom: 40, alignItems: 'center' },
  footerText: { color: '#64748B', fontSize: 15 },
  footerLink: { color: '#2563EB', fontWeight: 'bold' }
});