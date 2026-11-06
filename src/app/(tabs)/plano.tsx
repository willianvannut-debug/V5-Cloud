// ============================================
// V5 Fibra - Tela Meu Plano
// ============================================

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme';
import {
  formatCurrency,
  formatDate,
  formatSpeed,
  getConnectionStatusInfo,
} from '@/utils/format';
import { fetchWithCache } from '@/utils/cache';
import { ContratoComPlano } from '@/types';

export default function PlanoScreen() {
  const { session } = useAuth();
  const [contrato, setContrato] = useState<ContratoComPlano | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const cliente = session?.cliente;
  const statusInfo = getConnectionStatusInfo(cliente?.status || '');

  const loadContrato = useCallback(async () => {
    if (!cliente) return;

    try {
      const result = await fetchWithCache<ContratoComPlano | null>(
        `plano_${cliente.id}`,
        async () => {
          const { data, error } = await supabase
            .from('contratos')
            .select('*, plano:planos(*)')
            .eq('cliente_id', cliente.id)
            .eq('status', 'ativo')
            .single();

          if (error) throw error;
          return data as ContratoComPlano | null;
        }
      );
      setContrato(result.data);
    } catch {
      // Sem dados
    } finally {
      setLoading(false);
    }
  }, [cliente]);

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContrato();
    setRefreshing(false);
  }, [loadContrato]);

  const plano = contrato?.plano;

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
        <Text style={styles.title}>Meu Plano</Text>

        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Carregando...</Text>
          </View>
        ) : !contrato || !plano ? (
          <View style={styles.empty}>
            <Ionicons name="wifi-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum plano ativo</Text>
          </View>
        ) : (
          <>
            {/* Card do Plano */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planIcon}>
                  <Ionicons name="wifi" size={28} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.planName}>{plano.nome}</Text>
                  <View style={styles.planStatus}>
                    <View
                      style={[styles.dot, { backgroundColor: statusInfo.color }]}
                    />
                    <Text style={[styles.planStatusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Velocidade */}
              <View style={styles.speedContainer}>
                <View style={styles.speedItem}>
                  <Ionicons
                    name="speedometer-outline"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.speedLabel}>Velocidade</Text>
                  <Text style={styles.speedValue}>
                    {formatSpeed(plano.velocidade)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Detalhes do Contrato */}
            <Text style={styles.sectionTitle}>Detalhes do Contrato</Text>
            <View style={styles.detailsCard}>
              <DetailRow
                icon="cash-outline"
                label="Valor mensal"
                value={formatCurrency(plano.preco)}
              />
              {cliente?.dia_vencimento && (
                <DetailRow
                  icon="calendar-outline"
                  label="Dia de vencimento"
                  value={`Dia ${cliente.dia_vencimento}`}
                />
              )}
              <DetailRow
                icon="play-circle-outline"
                label="Início do contrato"
                value={formatDate(contrato.data_inicio)}
              />
              {contrato.data_vencimento && (
                <DetailRow
                  icon="stop-circle-outline"
                  label="Fim do contrato"
                  value={formatDate(contrato.data_vencimento)}
                />
              )}
              {contrato.fidelidade_meses && (
                <DetailRow
                  icon="lock-closed-outline"
                  label="Fidelidade"
                  value={`${contrato.fidelidade_meses} meses`}
                />
              )}
            </View>

            {/* Info do Cliente */}
            <Text style={styles.sectionTitle}>Seus Dados</Text>
            <View style={styles.detailsCard}>
              <DetailRow
                icon="person-outline"
                label="Nome"
                value={cliente?.nome || '-'}
              />
              <DetailRow
                icon="call-outline"
                label="Telefone"
                value={cliente?.telefone || '-'}
              />
              <DetailRow
                icon="mail-outline"
                label="E-mail"
                value={cliente?.email || '-'}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  speedItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  speedLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  speedValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    maxWidth: '50%',
    textAlign: 'right',
  },
});
