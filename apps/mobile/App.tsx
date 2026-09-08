import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Activity, ActivityCategory } from "@locapay/shared-types";

const CATEGORIES: ActivityCategory[] = [
  "DEVELOPPEMENT",
  "REUNION",
  "FORMATION",
  "RECHERCHE",
  "DOCUMENTATION",
  "AUTRE",
];

const initialActivities: Activity[] = [
  {
    id: "act-1",
    stagiaireId: "demo-stagiaire",
    date: new Date().toISOString(),
    category: "DEVELOPPEMENT",
    description: "Intégration du module de facturation et tests unitaires.",
    durationMinutes: 240,
    status: "SOUMISE",
  },
  {
    id: "act-2",
    stagiaireId: "demo-stagiaire",
    date: new Date(Date.now() - 86400000).toISOString(),
    category: "REUNION",
    description: "Point de synchronisation hebdomadaire avec le tuteur.",
    durationMinutes: 60,
    status: "VALIDEE",
    tutorComment: "Parfait, objectifs atteints.",
  },
  {
    id: "act-3",
    stagiaireId: "demo-stagiaire",
    date: new Date(Date.now() - 172800000).toISOString(),
    category: "FORMATION",
    description: "Prise en main des règles métier et architecture LOCAPAY.",
    durationMinutes: 120,
    status: "VALIDEE",
  },
];

export default function App() {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityCategory>("DEVELOPPEMENT");
  const [durationHours, setDurationHours] = useState("2");

  function addActivity() {
    if (!description.trim()) return;
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      stagiaireId: "demo-stagiaire",
      date: new Date().toISOString(),
      category,
      description: description.trim(),
      durationMinutes: Math.max(15, (Number(durationHours) || 1) * 60),
      status: "SOUMISE",
    };
    setActivities([newAct, ...activities]);
    setDescription("");
    setModalVisible(false);
  }

  const totalValidatedHours = Math.round(
    activities
      .filter((a) => a.status === "VALIDEE")
      .reduce((sum, a) => sum + a.durationMinutes, 0) / 60,
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>LOCAPAY</Text>
        <Text style={styles.title}>Journal de bord</Text>
        <Text style={styles.subtitle}>
          {totalValidatedHours} h validées sur mobile
        </Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.category}>{item.category}</Text>
              <View
                style={[
                  styles.badge,
                  item.status === "VALIDEE"
                    ? styles.badgeGreen
                    : item.status === "SOUMISE"
                      ? styles.badgeOrange
                      : styles.badgeRed,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === "VALIDEE"
                      ? styles.badgeTextGreen
                      : item.status === "SOUMISE"
                        ? styles.badgeTextOrange
                        : styles.badgeTextRed,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>
                {new Date(item.date).toLocaleDateString("fr-FR")} · {Math.round(item.durationMinutes / 60)} h
              </Text>
              {item.tutorComment ? (
                <Text style={styles.tutorComment}>💬 {item.tutorComment}</Text>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Floating Add Button */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Saisie</Text>
      </Pressable>

      {/* Modal for New Activity */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle activité</Text>

            <Text style={styles.label}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Durée (heures)</Text>
            <TextInput
              keyboardType="numeric"
              value={durationHours}
              onChangeText={setDurationHours}
              style={styles.input}
              placeholder="ex: 2"
            />

            <Text style={styles.label}>Description du travail</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez ce que vous avez accompli aujourd'hui..."
              style={[styles.input, styles.textArea]}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.buttonPrimary]} onPress={addActivity}>
                <Text style={styles.buttonPrimaryText}>Soumettre</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fbfcf8" },
  header: { padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#dce5dd" },
  brand: { color: "#0f5b45", fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  title: { color: "#17211b", fontWeight: "800", fontSize: 26, marginTop: 4 },
  subtitle: { color: "#657067", fontSize: 14, marginTop: 2 },
  list: { padding: 20, paddingBottom: 90, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderColor: "#dce5dd",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { color: "#0f5b45", fontWeight: "800", fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeGreen: { backgroundColor: "#dff4e6" },
  badgeOrange: { backgroundColor: "#ffe8bf" },
  badgeRed: { backgroundColor: "#ffe0df" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  badgeTextGreen: { color: "#0f5b45" },
  badgeTextOrange: { color: "#8a5c00" },
  badgeTextRed: { color: "#9b2f2c" },
  description: { color: "#17211b", fontSize: 15, lineHeight: 22 },
  cardMeta: { borderTopWidth: 1, borderTopColor: "#f1f5f2", paddingTop: 8, marginTop: 4 },
  metaText: { color: "#657067", fontSize: 12, fontWeight: "600" },
  tutorComment: { color: "#0f5b45", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#0f5b45",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(23, 33, 27, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#17211b", marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#17211b", marginTop: 4 },
  categoryPicker: { flexDirection: "row", marginBottom: 6 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f2",
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: "#0f5b45" },
  categoryChipText: { fontSize: 12, fontWeight: "700", color: "#657067" },
  categoryChipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#dce5dd",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: "center" },
  buttonPrimary: { backgroundColor: "#0f5b45" },
  buttonPrimaryText: { color: "#fff", fontWeight: "800" },
  buttonSecondary: { backgroundColor: "#f1f5f2" },
  buttonSecondaryText: { color: "#17211b", fontWeight: "700" },
});
