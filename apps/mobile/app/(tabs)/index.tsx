import { StyleSheet, Text, View } from 'react-native'

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Roost V2</Text>
      <Text style={styles.subtitle}>Today — Phase 0 scaffold</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
})
