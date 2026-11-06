// ============================================
// V5 Fibra - Tela Home
// ============================================

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme';
import {
  formatCurrency,
  formatDate,
  formatSpeed,
  getConnectionStatusInfo,
  getFaturaStatusInfo,
} from '@/utils/format';
import { fetchWithCache } from '@/utils/cache';
import { Fatura, ContratoComPlano } from '@/types';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [faturaPendente, setFaturaPendente] = useState<Fatura | null>(null);
  const [contrato, setContrato] = useState<ContratoComPlano | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const cliente = session?.cliente;
  const statusInfo = getConnectionStatusInfo(cliente?.status || '');

  const loadData = useCallback(async () => {
    if (!cliente) return;

    try {
      // Buscar fatura pendente mais próxima
      const faturaResult = await fetchWithCache<Fatura | null>(
        `home_fatura_${cliente.id}`,
        async () => {
          const { data } = await supabase
            .from('faturas')
            .select('*')
            .eq('cliente_id', cliente.id)
            .in('status', ['pendente', 'vencida'])
            .order('data_vencimento', { ascending: true })
            .limit(1)
            .single();
          return data as Fatura | null;
        }
      );
      setFaturaPendente(faturaResult.data);

      // Buscar contrato com plano
      const contratoResult = await fetchWithCache<ContratoComPlano | null>(
        `home_contrato_${cliente.id}`,
        async () => {
          const { data } = await supabase
            .from('contratos')
            .select('*, plano:planos(*)')
            .eq('cliente_id', cliente.id)
            .eq('status', 'ativo')
            .single();
          return data as ContratoComPlano | null;
        }
      );
      setContrato(contratoResult.data);
      setFromCache(faturaResult.fromCache || contratoResult.fromCache);
    } catch {
      // Sem dados
    }
  }, [cliente]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.name}>
              {cliente?.nome?.split(' ')[0] || 'Cliente'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {fromCache && (
          <View style={styles.cacheWarning}>
            <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
            <Text style={styles.cacheWarningText}>Dados offline</Text>
          </View>
        )}

        {/* Status da Conexão */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusDot}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: statusInfo.color },
                ]}
              />
            </View>
            <Text style={styles.statusLabel}>Status da Conexão</Text>
          </View>
          <Text style={[styles.statusValue, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>

          {contrato?.plano && (
            <View style={styles.planRow}>
              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Plano</Text>
                <Text style={styles.planValue}>{contrato.plano.nome}</Text>
              </View>
              <View style={styles.planDivider} />
              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Velocidade</Text>
                <Text style={styles.planValue}>
                  {formatSpeed(contrato.plano.velocidade)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Card Fatura Pendente */}
        {faturaPendente && (
          <TouchableOpacity
            style={styles.faturaCard}
            onPress={() => router.push('/(tabs)/faturas')}
            activeOpacity={0.7}
          >
            <View style={styles.faturaHeader}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.faturaTitle}>Fatura Pendente</Text>
            </View>

            <View style={styles.faturaBody}>
              <View>
                <Text style={styles.faturaValor}>
                  {formatCurrency(faturaPendente.valor)}
                </Text>
                <Text style={styles.faturaVencimento}>
                  Venc.: {formatDate(faturaPendente.data_vencimento)}
                </Text>
              </View>
              <View
                style={[
                  styles.faturaStatus,
                  {
                    backgroundColor:
                      getFaturaStatusInfo(faturaPendente.status).color + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.faturaStatusText,
                    {
                      color: getFaturaStatusInfo(faturaPendente.status).color,
                    },
                  ]}
                >
                  {getFaturaStatusInfo(faturaPendente.status).label}
                </Text>
              </View>
            </View>

            <View style={styles.faturaAction}>
              <Text style={styles.faturaActionText}>Ver detalhes</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Atalhos Rápidos */}
        <Text style={styles.sectionTitle}>Acesso rápido</Text>
        <View style={styles.shortcuts}>
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => router.push('/(tabs)/faturas')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="receipt-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.shortcutLabel}>Faturas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => router.push('/(tabs)/suporte')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="chatbubbles-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.shortcutLabel}>Suporte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => router.push('/(tabs)/plano')}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="wifi-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.shortcutLabel}>Meu Plano</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  cacheWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  cacheWarningText: {
    fontSize: fontSize.xs,
    color: colors.warning,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  planItem: {
    flex: 1,
    alignItems: 'center',
  },
  planDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  planLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  planValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  faturaCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  faturaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  faturaTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  faturaBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  faturaValor: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  faturaVencimento: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  faturaStatus: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  faturaStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  faturaAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  faturaActionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shortcutItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});
