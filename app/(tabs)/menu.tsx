import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/src/providers/AuthProvider';
import { Card, Divider, ListRow, Segmented } from '@/src/components/ui/misc';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Sheet } from '@/src/components/ui/Sheet';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt } from '@/src/components/ui/Txt';
import { toast } from '@/src/components/ui/Toast';
import { usePages, useProfile } from '@/src/hooks/queries';
import { useBottomSpace } from '@/src/hooks/useBottomSpace';
import { api, errorMessage } from '@/src/lib/api';
import { setThemePreference, useSettings, type ThemePreference } from '@/src/lib/settings';
import { totalDownloadedBytes, useDownloads } from '@/src/lib/downloads';
import { useAllBookmarks } from '@/src/lib/library';
import { formatBytes } from '@/src/lib/format';
import { SUPPORT_PHONE, WEBSITE_URL } from '@/src/config';
import { fonts, radius, useTheme } from '@/src/theme';
import type { Customer } from '@/src/types';

export default function Menu() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace(true);
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const profile = useProfile();
  const pages = usePages();
  const theme = useSettings((s) => s.theme);
  const downloads = useDownloads();
  const bookmarks = useAllBookmarks();
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const user = profile.data;
  const downloadCount = Object.keys(downloads).length;
  const bookmarkCount = Object.values(bookmarks).reduce((n, list) => n + list.length, 0);

  const setUser = (next: Customer) => queryClient.setQueryData(['profile'], next);

  const changeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const updated = await api.upload<Customer>(
        '/customers/profile',
        [{ name: 'avatar', uri: asset.uri, type: asset.mimeType ?? 'image/jpeg' }],
        { action: 'update_avatar' },
      );
      setUser(updated);
      toast('ފޮޓޯ ބަދަލުކުރެވިއްޖެ', { kind: 'success' });
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const saveName = async (name: string) => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const updated = await api.post<Customer>('/customers/profile', { name: name.trim(), action: 'update_name' });
      setUser(updated);
      setEditing(false);
      toast('ނަން ބަދަލުކުރެވިއްޖެ', { kind: 'success' });
    } catch (e) {
      toast(errorMessage(e), { kind: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const logout = () => {
    Alert.alert(
      'ލޮގް އައުޓް ކުރަންތަ؟',
      'ލޮގް އައުޓް ކުރުމުން މި ފޯނުގައިވާ ޑައުންލޯޑްތަކާއި ބުކްމާކްތައް ފޮހެވޭނެ.',
      [
        { text: 'ނޫން', style: 'cancel' },
        {
          text: 'ލޮގް އައުޓް',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
            } catch {
              setLoggingOut(false);
              Alert.alert('Error Logging Out', 'You can try to clear app cache to logout.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottom, paddingHorizontal: 16, gap: 18 }}>
        <Txt variant="display">މެނޫ</Txt>

        {/* Profile */}
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card style={styles.profile}>
            <PressableScale onPress={changeAvatar} haptic style={styles.avatarWrap} accessibilityLabel="ފޮޓޯ ބަދަލުކުރުމަށް">
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
              ) : (
                <Skeleton width={72} height={72} radius={36} />
              )}
              <View style={[styles.cameraBadge, { backgroundColor: t.primary, borderColor: t.surface }]}>
                {uploading ? <ActivityIndicator size="small" color={t.onPrimary} /> : <Ionicons name="camera" size={13} color={t.onPrimary} />}
              </View>
            </PressableScale>
            <View style={{ flex: 1 }}>
              {user ? (
                <>
                  <Txt variant="title" numberOfLines={1}>
                    {user.name_dv || user.name}
                  </Txt>
                  <Txt variant="caption" tone="muted" ltr numberOfLines={1} style={{ textAlign: 'auto' }}>
                    {user.email}
                  </Txt>
                </>
              ) : (
                <View style={{ gap: 8 }}>
                  <Skeleton width={140} height={18} />
                  <Skeleton width={180} height={12} />
                </View>
              )}
            </View>
            <PressableScale
              haptic
              onPress={() => setEditing(true)}
              style={[styles.edit, { backgroundColor: t.primarySoft }]}
              accessibilityLabel="ނަން ބަދަލުކުރުމަށް"
            >
              <Ionicons name="pencil" size={16} color={t.primary} />
            </PressableScale>
          </Card>
        </Animated.View>

        {/* Library */}
        <Section title="ލައިބްރަރީ">
          <ListRow
            icon="bookmarks-outline"
            title="ބުކްމާކްތައް"
            subtitle={bookmarkCount ? `${bookmarkCount} ބުކްމާކް` : 'ކިޔާއިރު ސަފްޙާތައް ބުކްމާކް ކުރެވޭނެ'}
            onPress={() => router.push('/bookmarks')}
          />
          <Divider inset={64} />
          <ListRow
            icon="cloud-download-outline"
            title="ޑައުންލޯޑްތައް"
            subtitle={downloadCount ? `${downloadCount} ފޮތް • ${formatBytes(totalDownloadedBytes(downloads))}` : 'އޮފްލައިންކޮށް ކިޔުމަށް'}
            onPress={() => router.push('/downloads')}
          />
        </Section>

        {/* Appearance */}
        <Section title="ފެންނަ ގޮތް">
          <View style={{ padding: 12 }}>
            <Segmented<ThemePreference>
              value={theme}
              onChange={setThemePreference}
              options={[
                { value: 'system', label: 'ސިސްޓަމް', icon: 'phone-portrait-outline' },
                { value: 'light', label: 'އަލި', icon: 'sunny-outline' },
                { value: 'dark', label: 'އަނދިރި', icon: 'moon-outline' },
              ]}
            />
          </View>
        </Section>

        {/* App & support */}
        <Section title="ސަޕޯޓް">
          <ListRow icon="call-outline" title="އިތުރު މަޢުލޫމާތު ހޯދުމަށް" subtitle={SUPPORT_PHONE} onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)} />
          <Divider inset={64} />
          <ListRow icon="globe-outline" title="ވެބްސައިޓް" subtitle="dhivehifoiy.mv" onPress={() => Linking.openURL(WEBSITE_URL)} />
          <Divider inset={64} />
          <ListRow icon="sync-outline" title="އެޕްލިކޭޝަން އަދާހަމަ ކުރުމަށް" onPress={() => Linking.openURL(WEBSITE_URL)} />
          {pages.data?.map((page) => (
            <React.Fragment key={page.slug}>
              <Divider inset={64} />
              <ListRow
                icon="document-text-outline"
                title={page.title}
                onPress={() => router.push({ pathname: '/pages/[slug]', params: { slug: page.slug, title: page.title } })}
              />
            </React.Fragment>
          ))}
        </Section>

        <Card>
          <ListRow icon="log-out-outline" title="ލޮގް އައުޓް" destructive loading={loggingOut} chevron={false} onPress={logout} />
        </Card>

        <Txt variant="caption" tone="faint" center ltr>
          {`Dhivehi Foiy v${Constants.expoConfig?.version ?? ''}`}
        </Txt>
      </ScrollView>

      <Sheet visible={editing} onClose={() => setEditing(false)} title="ނަން ބަދަލުކުރުން" subtitle="ބަދަލުކުރުމަށް ބޭނުންވާ ނަން ޖައްސަވާ">
        <NameEditor initial={user?.name_dv ?? ''} onSave={saveName} saving={savingName} />
      </Sheet>
    </View>
  );
}

/** Owns its own input state so typing isn't delayed by the sheet portal. */
function NameEditor({ initial, onSave, saving }: { initial: string; onSave: (name: string) => void; saving: boolean }) {
  const t = useTheme();
  const [name, setName] = useState(initial);
  return (
    <>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="ނަން ޖައްސަވާ"
        placeholderTextColor={t.textFaint}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.surfaceAlt, fontFamily: fonts.faseyha }]}
        returnKeyType="done"
        onSubmitEditing={() => onSave(name)}
      />
      <Button title="ސޭވްކޮށްލާ" onPress={() => onSave(name)} loading={saving} disabled={!name.trim()} style={{ marginTop: 12 }} />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" tone="muted" style={{ paddingHorizontal: 6 }}>
        {title}
      </Txt>
      <Card>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatarWrap: { width: 72, height: 72 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    end: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  edit: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontSize: 17, writingDirection: 'rtl' },
});
