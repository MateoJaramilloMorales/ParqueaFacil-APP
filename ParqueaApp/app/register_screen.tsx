import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'cliente' | 'admin'>('cliente'); 
  const [codigoAdmin, setCodigoAdmin] = useState(''); 
  const [loading, setLoading] = useState(false);

  // Estados dinámicos para enfoque visual de bordes
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    // 1. Validación de campos generales requeridos
    if (!nombre || !email || !password) {
      return Alert.alert("Campos vacíos", "Por favor completa toda la información.");
    }

    // 2. Bloqueo y validación estricta del código secreto solo para Dueños
    if (rol === 'admin') {
      if (!codigoAdmin) {
        return Alert.alert("Código requerido", "Por favor ingresa el código de acceso secreto para Dueños.");
      }
      
      // Compara ignorando espacios y obligando a que coincida exactamente con PARQUEA2026
      if (codigoAdmin.trim().toUpperCase() !== 'PARQUEA2026') {
        return Alert.alert(
          "Código incorrecto", 
          "El código introducido no es válido. No tienes autorización para registrarte como Dueño."
        );
      }
    }
    
    setLoading(true);
    try {
      await axios.post('http://192.168.1.70:3001/registro', { 
        nombre: nombre.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        rol,
        codigo_admin: rol === 'admin' ? codigoAdmin.trim().toUpperCase() : undefined
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
    <View style={styles.masterContainer}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea}>
        {/* BOTÓN VOLVER FLOTANTE */}
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} style={styles.btnBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back-sharp" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            <View style={styles.centerAlignmentContainer}>
              {/* CABECERA CENTRADA */}
              <View style={styles.headerContainer}>
                <Text style={styles.title}>Crea tu <Text style={styles.titleAccent}>Cuenta</Text></Text>
                <Text style={styles.subtitle}>Regístrate en la consola unificada de ParqueaFácil</Text>
              </View>

              {/* TARJETA FORMULARIO */}
              <View style={styles.cardForm}>
                
                {/* Selector de Roles Integrado */}
                <Text style={styles.roleTitle}>¿Cómo usarás la aplicación?</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity 
                    activeOpacity={0.9}
                    style={[styles.roleCard, rol === 'cliente' && styles.roleActive]} 
                    onPress={() => setRol('cliente')}
                  >
                    <Ionicons name="car" size={26} color={rol === 'cliente' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.roleText, rol === 'cliente' && styles.roleTextActive]}>Conductor</Text>
                    {rol === 'cliente' && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={styles.checkIcon} />}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    activeOpacity={0.9}
                    style={[styles.roleCard, rol === 'admin' && styles.roleActive]} 
                    onPress={() => setRol('admin')}
                  >
                    <Ionicons name="business" size={24} color={rol === 'admin' ? '#FFF' : '#64748B'} />
                    <Text style={[styles.roleText, rol === 'admin' && styles.roleTextActive]}>Dueño</Text>
                    {rol === 'admin' && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={styles.checkIcon} />}
                  </TouchableOpacity>
                </View>

                {/* Campo Nombre */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, isNameFocused && styles.labelFocused]}>Nombre Completo</Text>
                  <View style={[styles.inputWrapper, isNameFocused && styles.inputWrapperFocused]}>
                    <Ionicons name="person" size={18} color={isNameFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Juan Pérez" 
                      placeholderTextColor="#94A3B8"
                      value={nombre} 
                      onChangeText={setNombre} 
                      onFocus={() => setIsNameFocused(true)}
                      onBlur={() => setIsNameFocused(false)}
                    />
                  </View>
                </View>

                {/* Campo Correo */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, isEmailFocused && styles.labelFocused]}>Correo Electrónico</Text>
                  <View style={[styles.inputWrapper, isEmailFocused && styles.inputWrapperFocused]}>
                    <Ionicons name="mail" size={18} color={isEmailFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="ejemplo@correo.com" 
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address" 
                      autoCapitalize="none" 
                      value={email} 
                      onChangeText={setEmail} 
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                    />
                  </View>
                </View>

                {/* Campo Contraseña */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, isPasswordFocused && styles.labelFocused]}>Contraseña</Text>
                  <View style={[styles.inputWrapper, isPasswordFocused && styles.inputWrapperFocused]}>
                    <Ionicons name="lock-closed" size={18} color={isPasswordFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="••••••••" 
                      placeholderTextColor="#94A3B8"
                      secureTextEntry 
                      value={password} 
                      onChangeText={setPassword} 
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                    />
                  </View>
                </View>

                {/* Campo Condicional para Código Secreto */}
                {rol === 'admin' && (
                  <View style={[styles.inputGroup, { marginTop: 4 }]}>
                    <Text style={[styles.label, isCodeFocused && styles.labelFocused]}>Código de Acceso Dueño</Text>
                    <View style={[styles.inputWrapper, isCodeFocused && styles.inputWrapperFocused]}>
                      <Ionicons name="key" size={18} color={isCodeFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Escribe el código secreto"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        autoCapitalize="characters"
                        value={codigoAdmin}
                        onChangeText={setCodigoAdmin}
                        onFocus={() => setIsCodeFocused(true)}
                        onBlur={() => setIsCodeFocused(false)}
                      />
                    </View>
                    <View style={styles.supportContainer}>
                      <Ionicons name="chatbox-ellipses" size={14} color="#64748B" />
                      <Text style={styles.supportText}>Usa el token maestro corporativo o contacta a soporte.</Text>
                    </View>
                  </View>
                )}

                {/* Botón de Enviar */}
                <TouchableOpacity activeOpacity={0.85} style={styles.btnRegister} onPress={handleRegister} disabled={loading}>
                  <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientBtn}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.btnRegisterText}>REGISTRAR CUENTA</Text>
                        <Ionicons name="arrow-forward-sharp" size={16} color="#FFF" style={styles.btnArrow} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

              </View>

              {/* Enlace de Regreso a Login */}
              <TouchableOpacity style={styles.btnLoginLink} onPress={() => router.replace('/login_screen')} activeOpacity={0.6}>
                <Text style={styles.loginLinkText}>¿Ya tienes cuenta? <Text style={styles.loginAccent}>Inicia Sesión</Text></Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  masterContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  topBar: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 8,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  btnBack: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 2,
  },
  keyboardView: { flex: 1 },
  scrollContainer: { 
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  centerAlignmentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.01,
  },
  headerContainer: { alignItems: 'center', marginBottom: 26, width: '100%' },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1, textAlign: 'center' },
  titleAccent: { color: '#2563EB' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 5, fontWeight: '600', letterSpacing: 0.1, textAlign: 'center' },
  
  cardForm: { 
    backgroundColor: '#FFFFFF', 
    width: '100%', 
    borderRadius: 26, 
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 28,
    elevation: 4,
  },
  roleTitle: { fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, textAlign: 'center' },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  roleCard: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 14, 
    borderRadius: 16, 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    position: 'relative' 
  },
  roleActive: { 
    backgroundColor: '#2563EB', 
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3
  },
  roleText: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#64748B' },
  roleTextActive: { color: '#FFF' },
  checkIcon: { position: 'absolute', top: 8, right: 8 },

  inputGroup: { marginBottom: 16, width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  labelFocused: { color: '#2563EB' },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    paddingHorizontal: 14 
  },
  inputWrapperFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F6FF',
  },
  icon: { marginRight: 10 },
  input: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'ios' ? 14 : 10, 
    fontSize: 14, 
    color: '#0F172A', 
    fontWeight: '600' 
  },
  
  supportContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  supportText: { fontSize: 11, color: '#64748B', fontWeight: '500', flex: 1 },

  btnRegister: { 
    width: '100%', 
    marginTop: 12, 
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  gradientBtn: {
    padding: 15, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnRegisterText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.6 },
  btnArrow: { marginLeft: 8 },
  
  btnLoginLink: { marginTop: 24, alignItems: 'center', padding: 10, width: '100%' },
  loginLinkText: { color: '#64748B', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  loginAccent: { fontWeight: '700', color: '#2563EB' }
});