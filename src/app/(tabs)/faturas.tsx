// ============================================
// V5 Fibra - Tela de Faturas
// ============================================

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme';
import { formatCurrency, formatDate, getFaturaStatusInfo } from '@/utils/format';
import { fetchWithCache } from '@/utils/cache';
import { Fatura } from '@/types';

type FilterType = 'todas' | 'pendente' | 'paga' | 'vencida';

export default function FaturasScreen() {
  const { session } = useAuth();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [filter, setFilter] = useState<FilterType>('todas');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  const cliente = session?.cliente;

  const loadFaturas = useCallback(async () => {
    if (!cliente) return;

    try {
      const result = await fetchWithCache<Fatura[]>(
        `faturas_${cliente.id}`,
        async () => {
          const { data, error } = await supabase
            .from('faturas')
            .select('*')
            .eq('cliente_id', cliente.id)
            .order('data_vencimento', { ascending: false });

          if (error) throw error;
          return (data as Fatura[]) || [];
        }
      );
      setFaturas(result.data);
    } catch {
      // Sem dados
    } finally {
      setLoading(false);
    }
  }, [cliente]);

  useEffect(() => {
    loadFaturas();
  }, [loadFaturas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFaturas();
    setRefreshing(false);
  }, [loadFaturas]);

  const filteredFaturas = faturas.filter((f) =>
    filter === 'todas' ? true : f.status === filter
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'paga', label: 'Pagas' },
    { key: 'vencida', label: 'Vencidas' },
  ];

  function renderFaturaItem({ item }: { item: Fatura }) {
    const statusInfo = getFaturaStatusInfo(item.status);

    return (
      <TouchableOpacity
        style={styles.faturaItem}
        onPress={() => setSelectedFatura(item)}
        activeOpacity={0.7}
      >
        <View style={styles.faturaLeft}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: statusInfo.color },
            ]}
          />
          <View>
            <Text style={styles.faturaValor}>
              {formatCurrency(item.valor)}
            </Text>
            <Text style={styles.faturaVencimento}>
              Venc.: {formatDate(item.data_vencimento)}
            </Text>
          </View>
        </View>
        <View style={styles.faturaRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.color + '20' },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Faturas</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={filteredFaturas}
        keyExtractor={(item) => item.id}
        renderItem={renderFaturaItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="receipt-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {loading ? 'Carregando...' : 'Nenhuma fatura encontrada'}
            </Text>
          </View>
        }
      />

      {/* Modal de Detalhes */}
      <Modal
        visible={!!selectedFatura}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedFatura(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFatura && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalhes da Fatura</Text>
                  <TouchableOpacity
                    onPress={() => setSelectedFatura(null)}
                    style={styles.modalClose}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Valor</Text>
                    <Text style={styles.modalValue}>
                      {formatCurrency(selectedFatura.valor)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Vencimento</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedFatura.data_vencimento)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Status</Text>
                    <Text
                      style={[
                        styles.modalValue,
                        {
                          color: getFaturaStatusInfo(selectedFatura.status)
                            .color,
                        },
                      ]}
                    >
                      {getFaturaStatusInfo(selectedFatura.status).label}
                    </Text>
                  </View>
                  {selectedFatura.metodo && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Método</Text>
                      <Text style={styles.modalValue}>
                        {selectedFatura.metodo}
                      </Text>
                    </View>
                  )}
                  {selectedFatura.data_pagamento && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Pago em</Text>
                      <Text style={styles.modalValue}>
                        {formatDate(selectedFatura.data_pagamento)}
                      </Text>
                    </View>
                  )}
                  {selectedFatura.identificador && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Identificador</Text>
                      <Text style={styles.modalValue}>
                        {selectedFatura.identificador}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  faturaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faturaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  faturaValor: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  faturaVencimento: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  faturaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalClose: {
    padding: spacing.xs,
  },
  modalInfo: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  modalValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
