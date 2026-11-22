# -*- coding: utf-8 -*-
import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'v5fibra-app')
path = os.path.join(BASE, 'src', 'app', '(tabs)', 'plano.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# Pedido do usuario: um botao simples na tela "Meu Plano" do app do
# cliente que abre uma pagina de teste de velocidade no navegador (nada
# elaborado, so Linking.openURL pra uma busca do Google -- o Google ja
# mostra um widget de teste de velocidade de internet embutido no
# resultado da busca).
# ======================================================================

old_import = """import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';"""

new_import = """import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';"""

assert t.count(old_import) == 1, "bloco de import do react-native nao encontrado"
t = t.replace(old_import, new_import)

old_plano_var = """  const plano = contrato?.plano;

  return ("""

new_plano_var = """  const plano = contrato?.plano;

  const abrirTesteVelocidade = () => {
    Linking.openURL('https://www.google.com/search?q=teste+de+velocidade+da+internet');
  };

  return ("""

assert t.count(old_plano_var) == 1, "ponto de insercao do handler nao encontrado"
t = t.replace(old_plano_var, new_plano_var)

old_bloco = """            {/* Detalhes do Contrato */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>"""

new_bloco = """            {/* Teste de Velocidade */}
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
              <TouchableOpacity
                onPress={abrirTesteVelocidade}
                style={[styles.locationButton, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  marginBottom: spacing.lg,
                  ...getShadow('sm', mode),
                }]}
                activeOpacity={0.7}
              >
                <View style={styles.locationButtonLeft}>
                  <View style={[styles.locationIcon, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name="speedometer" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.locationButtonTitle, { color: colors.text }]}>
                      Testar Velocidade
                    </Text>
                    <Text style={[styles.locationButtonSub, { color: colors.textMuted }]}>
                      Abrir teste de velocidade no navegador
                    </Text>
                  </View>
                </View>
                <Ionicons name="open-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            {/* Detalhes do Contrato */}
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>"""

assert t.count(old_bloco) == 1, "bloco 'Detalhes do Contrato' nao encontrado"
t = t.replace(old_bloco, new_bloco)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK plano.tsx (botao Testar Velocidade)')
