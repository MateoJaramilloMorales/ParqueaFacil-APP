import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store'; 

const { height } = Dimensions.get('window');

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
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* BOTÓN VOLVER FLOTANTE */}
        <View style={styles.topBar}>
          <TouchableOpacity activeOpacity={0.7} style={styles.btnBack} onPress={() => router.replace('/')}>
            <Ionicons name="arrow-back-sharp" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerAlignmentContainer}>
              
              {/* CABECERA CENTRADA */}
              <View style={styles.headerContainer}>
                <LinearGradient colors={['#3B82F6', '#1D4ED8']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.logoSquircle}>
                  <Ionicons name="car-sport" size={38} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.title}>Parquea<Text style={styles.titleAccent}>Fácil</Text></Text>
                <Text style={styles.subtitle}>Consola de Autenticación Unificada</Text>
              </View>

              {/* FORMULARIO */}
              <View style={styles.cardForm}>
                
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
                      secureTextEntry={!showPassword} 
                      autoCapitalize="none"
                      value={password} 
                      onChangeText={setPassword}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} activeOpacity={0.5}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botón Ingresar */}
                <TouchableOpacity activeOpacity={0.85} style={styles.btnLogin} onPress={handleLogin} disabled={loading}>
                  <LinearGradient colors={['#2563EB', '#1D4ED8']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientBtn}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <View style={styles.btnContent}>
                        <Text style={styles.btnLoginText}>INGRESAR AL PANEL</Text>
                        <Ionicons name="arrow-forward-sharp" size={16} color="#FFF" style={styles.btnArrow} />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

              </View>

              {/* Enlace de Registro Inferior */}
              <TouchableOpacity style={styles.btnRegisterLink} onPress={() => router.replace('/register_screen')} activeOpacity={0.6}>
                <Text style={styles.registerLinkText}>
                  ¿No tienes una cuenta? <Text style={styles.registerAccent}>Regístrate</Text>
                </Text>
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
    justifyContent: 'center', // Alinea el contenido verticalmente al centro de la pantalla
    alignItems: 'center', // Alinea horizontalmente
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  centerAlignmentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.04, // Ajuste para compensar visualmente la barra superior
  },
  headerContainer: { alignItems: 'center', marginBottom: 28, width: '100%' },
  logoSquircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1, textAlign: 'center' },
  titleAccent: { color: '#2563EB' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '600', letterSpacing: 0.2, textAlign: 'center' },
  
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
  inputGroup: { marginBottom: 18, width: '100%' },
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
  eyeIcon: { padding: 4 },
  
  btnLogin: { 
    width: '100%', 
    marginTop: 6, 
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
  btnLoginText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.6 },
  btnArrow: { marginLeft: 8 },
  
  btnRegisterLink: { marginTop: 24, alignItems: 'center', padding: 10, width: '100%' },
  registerLinkText: { color: '#64748B', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  registerAccent: { fontWeight: '700', color: '#2563EB' }
});