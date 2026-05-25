import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Dimensions, StatusBar, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; // 🛡️ Importamos SecureStore

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  // Función para verificar si ya existe sesión activa antes de redirigir
  const handleStartExperience = async () => {
    try {
      const email = await SecureStore.getItemAsync('usuario_email');
      const rol = await SecureStore.getItemAsync('usuario_rol');

      if (email && rol) {
        // Si ya hay sesión guardada, entra directamente según su rol
        if (rol === 'conductor') {
          router.replace('/user_panel');
        } else {
          router.replace('/admin_panel'); // O como se llame tu panel admin/dueño
        }
      } else {
        // Si está vacío, lo enviamos al Login de forma normal
        router.replace('/login_screen');
      }
    } catch (error) {
      // Ante cualquier fallo del almacenamiento, asegurar ir al Login
      router.replace('/login_screen');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1503387762-592dee58c460?q=80&w=1000' }} 
        style={styles.background}
      >
        <LinearGradient
          colors={['rgba(2, 6, 23, 0.1)', 'rgba(2, 6, 23, 0.9)', '#000']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.content}>
            
            {/* BRANDING MINIMALISTA */}
            <View style={styles.topLogo}>
              <Text style={styles.logoText}>P.</Text>
            </View>

            {/* CUERPO DE TEXTO ELEGANTE */}
            <View style={styles.textContainer}>
              <Text style={styles.preText}>MEDELLÍN • 2026</Text>
              <Text style={styles.mainTitle}>La ciudad en tus manos.</Text>
              <Text style={styles.description}>
                Encuentra parqueo de manera eficiente y vive la ciudad sin preocupaciones.
              </Text>
            </View>

            {/* SECCIÓN DE BOTONES DE CRISTAL */}
            <View style={styles.actionSection}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.glassBtn}
                onPress={handleStartExperience} // 👈 Cambiado a nuestra nueva función evaluadora
              >
                <Text style={styles.glassBtnText}>INICIAR EXPERIENCIA</Text>
                <View style={styles.arrowCircle}>
                  <Ionicons name="arrow-forward" size={16} color="#000" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.simpleBtn}
                onPress={() => router.push('/register_screen')}
              >
                <Text style={styles.simpleBtnText}>Crear cuenta nueva</Text>
              </TouchableOpacity>
            </View>

            {/* BARRA DE NAVEGACIÓN INFERIOR DECORATIVA */}
            <View style={styles.footerLine}>
               <View style={styles.lineActive} />
               <View style={styles.lineInactive} />
               <View style={styles.lineInactive} />
            </View>

          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  background: { width: width, height: height },
  gradient: { flex: 1, paddingHorizontal: 35, justifyContent: 'flex-end', paddingBottom: 60 },
  content: { width: '100%' },

  // Logo Minimal
  topLogo: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#000' },

  // Texto
  textContainer: { marginBottom: 50 },
  preText: { color: '#3B82F6', fontWeight: '900', fontSize: 11, letterSpacing: 3, marginBottom: 15 },
  mainTitle: { fontSize: 52, fontWeight: '300', color: '#FFF', lineHeight: 58, letterSpacing: -2 },
  description: { fontSize: 16, color: '#94A3B8', marginTop: 20, lineHeight: 24, fontWeight: '400', maxWidth: '80%' },

  // Botones
  actionSection: { width: '100%', gap: 15 },
  glassBtn: { 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: '#FFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 25,
    shadowColor: '#FFF',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10
  },
  glassBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },
  arrowCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  
  simpleBtn: { height: 50, alignItems: 'center', justifyContent: 'center' },
  simpleBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' },

  // Footer Decorativo
  footerLine: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 40 },
  lineActive: { width: 30, height: 3, backgroundColor: '#3B82F6', borderRadius: 2 },
  lineInactive: { width: 15, height: 3, backgroundColor: '#1E293B', borderRadius: 2 }
});