import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "../api/client";
import SectionHeader from "../components/SectionHeader";
import StatusNotice from "../components/StatusNotice";
import TacticalPanel from "../components/TacticalPanel";
import TacticalScreen from "../components/TacticalScreen";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const emptySonhoForm = { titulo: "", descricao: "", tipo: "principal" };
const emptyObjetivoForm = { titulo: "", descricao: "", data_alvo: "", sem_prazo: true };
const statusLabels = {
  ativo: "ATIVO",
  pausado: "PAUSADO",
  abandonado: "ABANDONADO",
  concluido: "CONCLUÍDO",
};

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function objetivosBySonho(objetivos) {
  return objetivos.reduce((groups, objetivo) => {
    if (!objetivo?.sonho_id) {
      return groups;
    }
    const key = String(objetivo.sonho_id);
    groups[key] = groups[key] || [];
    groups[key].push(objetivo);
    return groups;
  }, {});
}

export default function MountainScreen({ bottomPadding = 0, onLogout, token }) {
  const [sonhos, setSonhos] = useState([]);
  const [objetivos, setObjetivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [sonhoFormOpen, setSonhoFormOpen] = useState(false);
  const [objetivoFormOpen, setObjetivoFormOpen] = useState(false);
  const [objetivoSonhoId, setObjetivoSonhoId] = useState(null);
  const [sonhoForm, setSonhoForm] = useState(emptySonhoForm);
  const [objetivoForm, setObjetivoForm] = useState(emptyObjetivoForm);

  const principal = useMemo(
    () => sonhos.find((sonho) => sonho.status === "ativo" && sonho.tipo === "principal"),
    [sonhos],
  );
  const secundarios = useMemo(
    () => sonhos.filter((sonho) => sonho.status === "ativo" && sonho.tipo === "secundario"),
    [sonhos],
  );
  const objetivosVinculados = useMemo(() => objetivosBySonho(objetivos), [objetivos]);
  const objetivosIsolados = useMemo(() => objetivos.filter((objetivo) => !objetivo.sonho_id), [objetivos]);
  const busy = loading || mutating;

  useEffect(() => {
    loadMountain();
  }, [token]);

  async function handleUnauthorized(result) {
    if (result?.status === 401) {
      await onLogout?.();
      return true;
    }
    return false;
  }

  async function loadMountain(successMessage = "") {
    if (!token) {
      setLoading(false);
      return false;
    }
    setLoading(true);
    const [sonhosResult, objetivosResult] = await Promise.all([
      api.listSonhos(token),
      api.listObjetivos(token),
    ]);
    setLoading(false);

    if (await handleUnauthorized(sonhosResult) || await handleUnauthorized(objetivosResult)) {
      return false;
    }
    if (!sonhosResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(sonhosResult, "Não foi possível carregar sonhos.") });
      return false;
    }
    if (!objetivosResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(objetivosResult, "Não foi possível carregar objetivos.") });
      return false;
    }

    setSonhos(Array.isArray(sonhosResult.data) ? sonhosResult.data : []);
    setObjetivos(Array.isArray(objetivosResult.data) ? objetivosResult.data : []);
    setStatus(successMessage ? { type: "success", message: successMessage } : { type: "", message: "" });
    return true;
  }

  async function mutate(action, successMessage, fallbackMessage) {
    if (mutating) {
      return false;
    }
    setMutating(true);
    setStatus({ type: "", message: "" });
    const result = await action();
    setMutating(false);

    if (await handleUnauthorized(result)) {
      return false;
    }
    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, fallbackMessage) });
      await loadMountain();
      return false;
    }
    await loadMountain(successMessage);
    return true;
  }

  function openSonhoForm() {
    setSonhoForm({
      ...emptySonhoForm,
      tipo: principal ? "secundario" : "principal",
    });
    setSonhoFormOpen(true);
  }

  function openObjetivoForm(sonhoId = null) {
    setObjetivoSonhoId(sonhoId);
    setObjetivoForm(emptyObjetivoForm);
    setObjetivoFormOpen(true);
  }

  async function submitSonho() {
    if (!sonhoForm.titulo.trim()) {
      setStatus({ type: "error", message: "Informe o título do sonho." });
      return;
    }
    const saved = await mutate(
      () => api.createSonho(token, {
        titulo: sonhoForm.titulo.trim(),
        descricao: sonhoForm.descricao.trim() || null,
        tipo: sonhoForm.tipo,
      }),
      "Sonho registrado.",
      "Não foi possível registrar o sonho.",
    );
    if (saved) {
      setSonhoFormOpen(false);
    }
  }

  async function submitObjetivo() {
    if (!objetivoForm.titulo.trim()) {
      setStatus({ type: "error", message: "Informe o título do objetivo." });
      return;
    }
    const saved = await mutate(
      () => api.createObjetivo(token, {
        titulo: objetivoForm.titulo.trim(),
        descricao: objetivoForm.descricao.trim() || null,
        data_alvo: objetivoForm.sem_prazo ? null : objetivoForm.data_alvo || null,
        sonho_id: objetivoSonhoId,
      }),
      "Objetivo registrado.",
      "Não foi possível registrar o objetivo.",
    );
    if (saved) {
      setObjetivoFormOpen(false);
      setObjetivoSonhoId(null);
    }
  }

  function renderObjetivo(objetivo) {
    return (
      <View key={String(objetivo.id)} style={styles.objectiveCard}>
        <View style={styles.objectiveHead}>
          <Text style={styles.statusTag}>{statusLabels[objetivo.status] || objetivo.status}</Text>
          <Text style={styles.objectiveProgress}>{Number(objetivo.progresso || 0)}%</Text>
        </View>
        <Text numberOfLines={2} style={styles.objectiveTitle}>{objetivo.titulo}</Text>
        {objetivo.descricao ? <Text numberOfLines={2} style={styles.objectiveText}>{objetivo.descricao}</Text> : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Number(objetivo.progresso || 0)}%` }]} />
        </View>
        <Text style={styles.objectiveEmpty}>Objetivo sem ordens operacionais.</Text>
      </View>
    );
  }

  function renderSonho(sonho, secondary = false) {
    const vinculados = objetivosVinculados[String(sonho.id)] || [];
    return (
      <View key={String(sonho.id)} style={[styles.sonhoCard, secondary && styles.secondarySonho]}>
        <Text style={[styles.metaTag, secondary ? styles.secondaryTag : styles.primaryTag]}>
          {secondary ? "SECUNDÁRIO" : "PRINCIPAL"}
        </Text>
        <Text style={[styles.sonhoTitle, secondary && styles.secondaryTitle]}>{sonho.titulo}</Text>
        {sonho.descricao ? <Text style={styles.sonhoText}>{sonho.descricao}</Text> : null}
        <Pressable disabled={busy} onPress={() => openObjetivoForm(sonho.id)} style={styles.inlineFireButton}>
          <Text style={styles.inlineFireText}>+ NOVO OBJETIVO</Text>
        </Pressable>
        <View style={styles.branch}>
          <View style={styles.branchLine} />
          <View style={styles.branchContent}>
            {vinculados.length > 0 ? (
              vinculados.map(renderObjetivo)
            ) : (
              <Text style={styles.branchEmpty}>Nenhum objetivo vinculado a este sonho.</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <TacticalScreen variant="general">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + theme.spacing.xl },
        ]}
      >
        <TacticalPanel elevated>
          <SectionHeader
            eyebrow="A MONTANHA"
            tone="fire"
            title="Sonho → Objetivos → Missões"
            meta="Estrutura estratégica para orientar o que entra no quadro de execução."
          />
          <View style={styles.actions}>
            <Pressable disabled={busy} onPress={openSonhoForm} style={styles.fireButton}>
              <Text style={styles.fireText}>NOVO SONHO</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => openObjetivoForm(null)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>NOVO OBJETIVO ISOLADO</Text>
            </Pressable>
          </View>
        </TacticalPanel>

        <StatusNotice type={status.type} message={status.message} />

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.colors.fire} />
            <Text style={styles.loadingText}>SINCRONIZANDO MONTANHA</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionKicker}>SONHOS</Text>
              <Text style={styles.sectionTitle}>Topo da montanha</Text>
              {principal ? renderSonho(principal) : (
                <TacticalPanel fire>
                  <Text style={styles.sonhoTitle}>Nenhum sonho principal definido.</Text>
                  <Text style={styles.sonhoText}>Defina a campanha estratégica que orienta o comando.</Text>
                  <Pressable disabled={busy} onPress={openSonhoForm} style={styles.inlineFireButton}>
                    <Text style={styles.inlineFireText}>CRIAR SONHO PRINCIPAL</Text>
                  </Pressable>
                </TacticalPanel>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.groupTitle}>
                <Text style={styles.sectionTitleSmall}>SONHOS SECUNDÁRIOS</Text>
                <Text style={styles.groupCount}>{secundarios.length}</Text>
              </View>
              {secundarios.length > 0 ? secundarios.map((sonho) => renderSonho(sonho, true)) : (
                <Text style={styles.branchEmpty}>Nenhum sonho secundário ativo.</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.groupTitle}>
                <Text style={styles.sectionTitleSmall}>OBJETIVOS ISOLADOS</Text>
                <Text style={styles.groupCount}>{objetivosIsolados.length}</Text>
              </View>
              {objetivosIsolados.length > 0 ? objetivosIsolados.map(renderObjetivo) : (
                <Text style={styles.branchEmpty}>Nenhum objetivo isolado registrado.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <MountainModal
        busy={busy}
        onClose={() => setSonhoFormOpen(false)}
        onSubmit={submitSonho}
        open={sonhoFormOpen}
        title="Registrar direção estratégica"
      >
        <TextInput
          editable={!busy}
          onChangeText={(value) => setSonhoForm((current) => ({ ...current, titulo: value }))}
          placeholder="Título"
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          value={sonhoForm.titulo}
        />
        <TextInput
          editable={!busy}
          multiline
          onChangeText={(value) => setSonhoForm((current) => ({ ...current, descricao: value }))}
          placeholder="Descrição"
          placeholderTextColor={theme.colors.textDim}
          style={[styles.input, styles.multiline]}
          value={sonhoForm.descricao}
        />
      </MountainModal>

      <MountainModal
        busy={busy}
        onClose={() => setObjetivoFormOpen(false)}
        onSubmit={submitObjetivo}
        open={objetivoFormOpen}
        title={objetivoSonhoId ? "Novo objetivo" : "Novo objetivo isolado"}
      >
        <TextInput
          editable={!busy}
          onChangeText={(value) => setObjetivoForm((current) => ({ ...current, titulo: value }))}
          placeholder="Ex.: Consolidar rotina de treino"
          placeholderTextColor={theme.colors.textDim}
          style={styles.input}
          value={objetivoForm.titulo}
        />
        <TextInput
          editable={!busy}
          multiline
          onChangeText={(value) => setObjetivoForm((current) => ({ ...current, descricao: value }))}
          placeholder="Contexto opcional para orientar decisões futuras"
          placeholderTextColor={theme.colors.textDim}
          style={[styles.input, styles.multiline]}
          value={objetivoForm.descricao}
        />
      </MountainModal>
    </TacticalScreen>
  );
}

function MountainModal({ busy, children, onClose, onSubmit, open, title }) {
  return (
    <Modal animationType="fade" transparent visible={open}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.sectionKicker}>A MONTANHA</Text>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <View style={styles.modalActions}>
            <Pressable disabled={busy} onPress={onSubmit} style={styles.fireButton}>
              <Text style={styles.fireText}>{busy ? "AGUARDE" : "REGISTRAR"}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>CANCELAR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.screen,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  fireButton: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fireBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.layout.compactActionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  fireText: {
    ...theme.typography.small,
    color: theme.colors.black,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.layout.compactActionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  secondaryText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  loadingBox: {
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionKicker: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  sectionTitleSmall: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  groupTitle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  groupCount: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  sonhoCard: {
    backgroundColor: "rgba(17,17,17,0.94)",
    borderColor: theme.colors.fireBorder,
    borderLeftColor: theme.colors.fire,
    borderLeftWidth: 3,
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  secondarySonho: {
    borderColor: theme.colors.borderStrong,
    borderLeftColor: theme.colors.borderStrong,
  },
  metaTag: {
    ...theme.typography.small,
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  primaryTag: {
    backgroundColor: theme.colors.purpleWash,
    borderColor: theme.colors.purpleBorder,
    color: theme.colors.neonPurple,
  },
  secondaryTag: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    color: theme.colors.textMuted,
  },
  sonhoTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 18,
    marginTop: theme.spacing.sm,
  },
  secondaryTitle: {
    fontSize: 15,
  },
  sonhoText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  inlineFireButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
    minHeight: theme.layout.compactActionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  inlineFireText: {
    ...theme.typography.small,
    color: theme.colors.black,
  },
  branch: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  branchLine: {
    backgroundColor: theme.colors.fireBorder,
    width: 1,
  },
  branchContent: {
    flex: 1,
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  branchEmpty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  objectiveCard: {
    backgroundColor: "rgba(14,14,14,0.72)",
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  objectiveHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  statusTag: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  objectiveProgress: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  objectiveTitle: {
    ...theme.typography.label,
    color: theme.colors.text,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  objectiveText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  progressTrack: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 8,
    marginTop: theme.spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: theme.colors.fire,
    height: "100%",
  },
  objectiveEmpty: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: theme.spacing.xs,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  modalCard: {
    backgroundColor: theme.colors.surfaceCommand,
    borderColor: theme.colors.fireBorder,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    width: "100%",
  },
  modalTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 18,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  multiline: {
    minHeight: 112,
    paddingTop: theme.spacing.sm,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
});
