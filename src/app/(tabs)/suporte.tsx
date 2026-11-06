// ============================================
// V5 Fibra - Tela de Suporte (Chamados)
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
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/lib/theme';
import { formatDate, getTicketStatusInfo } from '@/utils/format';
import { fetchWithCache } from '@/utils/cache';
import { TicketAjuda } from '@/types';

const CATEGORIAS = [
  'Conexão lenta',
  'Sem conexão',
  'Financeiro',
  'Mudança de plano',
  'Mudança de endereço',
  'Outros',
];

export default function SuporteScreen() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<TicketAjuda[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [categoria, setCategoria] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cliente = session?.cliente;

  const loadTickets = useCallback(async () => {
    if (!cliente) return;

    try {
      const result = await fetchWithCache<TicketAjuda[]>(
        `tickets_${cliente.id}`,
        async () => {
          const { data, error } = await supabase
            .from('tickets_ajuda')
            .select('*')
            .eq('user_id', cliente.id)
            .order('criado_at', { ascending: false });

          if (error) throw error;
          return (data as TicketAjuda[]) || [];
        }
      );
      setTickets(result.data);
    } catch {
      // Sem dados
    } finally {
      setLoading(false);
    }
  }, [cliente]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  }, [loadTickets]);

  async function handleSubmitTicket() {
    if (!assunto.trim()) {
      Alert.alert('Erro', 'Digite um assunto para o chamado');
      return;
    }
    if (!mensagem.trim()) {
      Alert.alert('Erro', 'Descreva o problema');
      return;
    }
    if (!categoria) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    if (!cliente) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('tickets_ajuda').insert({
        user_id: cliente.id,
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
        categoria,
        status: 'aberto',
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Chamado aberto com sucesso!');
      setShowModal(false);
      setAssunto('');
      setMensagem('');
      setCategoria('');
      loadTickets();
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderTicketItem({ item }: { item: TicketAjuda }) {
    const statusInfo = getTicketStatusInfo(item.status);

    return (
      <View style={styles.ticketItem}>
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketTitulo} numberOfLines={1}>
            {item.assunto}
          </Text>
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
        </View>
        <Text style={styles.ticketDescricao} numberOfLines={2}>
          {item.mensagem}
        </Text>
        <View style={styles.ticketFooter}>
          <View style={styles.ticketMeta}>
            <Ionicons name="folder-outline" size={12} color={colors.textMuted} />
            <Text style={styles.ticketCategoria}>{item.categoria}</Text>
          </View>
          <Text style={styles.ticketData}>{formatDate(item.criado_at)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Suporte</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newButtonText}>Novo Chamado</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Tickets */}
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={renderTicketItem}
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
              name="chatbubbles-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {loading ? 'Carregando...' : 'Nenhum chamado'}
            </Text>
            <Text style={styles.emptySubtext}>
              Abra um novo chamado se precisar de ajuda
            </Text>
          </View>
        }
      />

      {/* Modal Novo Chamado */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Chamado</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Assunto */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Assunto</Text>
              <TextInput
                style={styles.formInput}
                value={assunto}
                onChangeText={setAssunto}
                placeholder="Resumo do problema"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            {/* Categoria */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Categoria</Text>
              <View style={styles.categorias}>
                {CATEGORIAS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoriaChip,
                      categoria === cat && styles.categoriaChipActive,
                    ]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text
                      style={[
                        styles.categoriaText,
                        categoria === cat && styles.categoriaTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mensagem */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mensagem</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={mensagem}
                onChangeText={setMensagem}
                placeholder="Descreva o problema com detalhes..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Botão Enviar */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmitTicket}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Chamado</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  newButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#FFF',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  ticketItem: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ticketTitulo: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
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
  ticketDescricao: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketCategoria: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  ticketData: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
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
    maxHeight: '90%',
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
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  formTextArea: {
    height: 100,
    paddingTop: spacing.md,
  },
  categorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoriaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoriaChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  categoriaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoriaTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: '#FFF',
  },
});
