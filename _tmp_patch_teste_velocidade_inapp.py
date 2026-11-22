# -*- coding: utf-8 -*-
import os

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas', 'v5fibra-app')
path = os.path.join(BASE, 'src', 'app', '(tabs)', 'plano.tsx')

with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# ======================================================================
# Usuario nao gostou de abrir o navegador externo (Google) pro teste de
# velocidade -- pediu pra mostrar dentro do proprio app. Troca o
# Linking.openURL por um push de rota pra tela teste-velocidade.tsx
# (nova tela com WebView do fast.com, dentro do app).
# ======================================================================

old_import = """import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';"""

new_import = """import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';"""

assert t.count(old_import) == 1, "bloco de import do react-native (com Linking) nao encontrado"
t = t.replace(old_import, new_import)

old_handler = """  const abrirTesteVelocidade = () => {
    Linking.openURL('https://www.google.com/search?q=teste+de+velocidade+da+internet');
  };"""

new_handler = """  const abrirTesteVelocidade = () => {
    router.push('/teste-velocidade');
  };"""

assert t.count(old_handler) == 1, "handler abrirTesteVelocidade (Linking) nao encontrado"
t = t.replace(old_handler, new_handler)

old_sub = """                    <Text style={[styles.locationButtonSub, { color: colors.textMuted }]}>
                      Abrir teste de velocidade no navegador
                    </Text>"""

new_sub = """                    <Text style={[styles.locationButtonSub, { color: colors.textMuted }]}>
                      Veja a velocidade da sua conexão aqui no app
                    </Text>"""

assert t.count(old_sub) == 1, "subtitulo do botao Testar Velocidade nao encontrado"
t = t.replace(old_sub, new_sub)

old_icon = """                <Ionicons name="open-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            {/* Detalhes do Contrato */}"""

new_icon = """                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>

            {/* Detalhes do Contrato */}"""

assert t.count(old_icon) == 1, "icone do botao Testar Velocidade nao encontrado"
t = t.replace(old_icon, new_icon)

with open(path, 'w', encoding='utf-8') as f:
    f.write(t)
print('OK plano.tsx (teste de velocidade agora dentro do app)')
