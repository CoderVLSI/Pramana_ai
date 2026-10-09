import React, { useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable } from "react-native";
export type StudyProfile = { name: string; language: string; mode: string; interests: string; ishtaDevata: string };
export const EMPTY_PROFILE: StudyProfile = { name: "", language: "English", mode: "Text", interests: "", ishtaDevata: "" };
export const PROFILE_KEY = "pramana-study-profile-v1";
export default function ProfileScreen({ initial, firstTime, onSave, onClose, onDelete }: { initial: StudyProfile; firstTime: boolean; onSave: (profile: StudyProfile) => Promise<void>; onClose: () => Promise<void>; onDelete: () => Promise<void> }) {
  const [profile, setProfile] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError("");
    try { await fn(); } catch { setError("Could not save changes on this device. Please try again."); }
    finally { setBusy(false); }
  }
  const button = { minHeight: 48, padding: 12, marginTop: 12, borderRadius: 10, backgroundColor: "#e4e5db", justifyContent: "center" as const };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, maxWidth: 640, width: "100%", alignSelf: "center" }}>
    <Text style={{ fontSize: 28, color: "#263d35", fontWeight: "700" }}>{firstTime ? "Welcome to Pramana" : "Your study preferences"}</Text>
    <Text style={{ marginVertical: 14, color: "#526459" }}>Tell us how you’d like to be addressed. These preferences stay on this device; you can edit or delete them anytime.</Text>
    {([['name','What should we call you?',80],['interests','Study interests (optional)',200],['ishtaDevata','Ishta Devata (optional)',80]] as const).map(([key,label,max]) => <View key={key} style={{ marginTop: 16 }}>
      <Text style={{ color: "#263d35", marginBottom: 8 }}>{label}</Text>
      <TextInput accessibilityLabel={label} value={profile[key]} maxLength={max} onChangeText={value => setProfile(p => ({...p,[key]:value}))} autoCapitalize="words" style={{ minHeight: 48, borderWidth: 1, borderColor: "#bdc6bc", borderRadius: 8, padding: 12, backgroundColor: "white" }} />
    </View>)}
    {([['language',['English','Hindi','Sanskrit']],['mode',['Text','Voice + text']]] as const).map(([key,options]) => <View key={key} style={{ marginTop: 18 }}>
      <Text style={{ color: "#263d35" }}>{key === 'language' ? 'Preferred language' : 'Preferred interaction'}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{options.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:profile[key]===value}} disabled={busy} onPress={() => setProfile(p=>({...p,[key]:value}))} style={button}><Text>{profile[key]===value?'◉':'○'} {value}</Text></Pressable>)}</View>
    </View>)}
    <Text style={{ marginTop: 16, color: "#526459", fontSize: 12 }}>Language and voice choices are preferences. Source languages and voice availability depend on the verified collection. Ishta Devata is optional and does not change scripture citations.</Text>
    {!!error && <Text accessibilityRole="alert" style={{color:'#a02f2f',marginTop:12}}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
      if (!profile.name.trim()) { setError("Enter a preferred name, or skip setup for now."); return; }
      void action(() => onSave({...profile,name:profile.name.trim(),interests:profile.interests.trim(),ishtaDevata:profile.ishtaDevata.trim()}));
    }} style={[button,{backgroundColor:'#315444'}]}><Text style={{color:'white',textAlign:'center'}}>Save preferences</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void action(onClose)} style={button}><Text style={{textAlign:'center'}}>{firstTime?'Skip for now':'Cancel'}</Text></Pressable>
    {!firstTime && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void action(onDelete)} style={button}><Text style={{textAlign:'center'}}>Delete study preferences</Text></Pressable>}
  </ScrollView>;
}
