import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store'; 

const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Campos vacíos", "Por favor ingresa tu correo y contraseña.");
    }

    setLoading(true);
    try {
      const response = await axios.post('http://192.168.1.70:3001/login', {
        email: email.trim().toLowerCase(),
        password: password
      });

      if (response.data) {
        await SecureStore.setItemAsync('usuario_email', response.data.email || email.trim().toLowerCase());
        await SecureStore.setItemAsync('usuario_nombre', response.data.nombre || 'Usuario');
        await SecureStore.setItemAsync('usuario_rol', response.data.rol || 'cliente');

        Alert.alert("¡Bienvenido!", `Hola de nuevo, ${response.data.nombre || 'Usuario'}`);
        
        const rolUsuario = response.data.rol;
        
        if (rolUsuario === 'admin' || rolUsuario === 'dueno') {
          router.replace('/admin_panel');
        } else if (rolUsuario === 'user_panel' || rolUsuario === 'cliente') {
          router.replace('/user_panel');
        } else {
          router.replace('/user_panel');
        }
      }
    } catch (e: any) {
      const msgError = e.response?.data?.error || "Correo o contraseña incorrectos. Verifica tus datos.";
      Alert.alert("Error de acceso", msgError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.masterContainer}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#F8FAFC', '#EEF2F6', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            
            {/* ILUSTRACIÓN / ICONO SUPERIOR */}
            <View style={styles.headerContainer}>
              <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.logoCircle}>
                <Ionicons name="car-sport" size={44} color="#2563EB" />
              </LinearGradient>
              <Text style={styles.title}>ParqueaFácil</Text>
              <Text style={styles.subtitle}>Gestiona tus celdas de parqueo o reserva tu cupo en tiempo real</Text>
            </View>

            {/* TARJETA CONTENEDORA (FORMULARIO) */}
            <View style={styles.cardForm}>
              
              {/* Campo Correo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={[
                  styles.inputWrapper, 
                  isEmailFocused && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="mail-outline" size={20} color={isEmailFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
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
                <Text style={styles.label}>Contraseña</Text>
                <View style={[
                  styles.inputWrapper, 
                  isPasswordFocused && styles.inputWrapperFocused
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color={isPasswordFocused ? "#2563EB" : "#94A3B8"} style={styles.icon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="••••••••" 
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword} 
                    autoCapitalize="none"
                    value={password} 
                    onChangeText={setPassword}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón Ingresar */}
              <TouchableOpacity activeOpacity={0.85} style={styles.btnLogin} onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientBtn}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnLoginText}>INGRESAR AL PANEL</Text>}
                </LinearGradient>
              </TouchableOpacity>

            </View>

            {/* Enlace de Registro Inferior */}
            <TouchableOpacity style={styles.btnRegisterLink} onPress={() => router.replace('/register_screen')}>
              <Text style={styles.registerLinkText}>
                ¿No tienes una cuenta? <Text style={styles.registerAccent}>Regístrate aquí</Text>
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  masterContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: { 
    paddingHorizontal: 22, 
    paddingBottom: 40, 
    paddingTop: height * 0.07, 
    alignItems: 'center' 
  },
  headerContainer: { alignItems: 'center', marginBottom: 35 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#2563EB',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  
  cardForm: { 
    backgroundColor: '#FFFFFF', 
    width: '100%', 
    borderRadius: 24, 
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 8, marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: '#F1F5F9', 
    paddingHorizontal: 16 
  },
  inputWrapperFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  icon: { marginRight: 12 },
  input: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'ios' ? 15 : 12, 
    fontSize: 15, 
    color: '#0F172A', 
    fontWeight: '500' 
  },
  eyeIcon: { padding: 4 },
  
  btnLogin: { 
    width: '100%', 
    marginTop: 10, 
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 3,
  },
  gradientBtn: {
    padding: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  btnLoginText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.8 },
  btnRegisterLink: { marginTop: 35, alignItems: 'center', padding: 10 },
  registerLinkText: { color: '#475569', fontSize: 14, fontWeight: '500' },
  registerAccent: { fontWeight: '700', color: '#2563EB', textDecorationLine: 'underline' }
});