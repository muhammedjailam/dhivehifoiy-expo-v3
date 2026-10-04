import React, { useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import type { TableContent } from 'react-native-pdf';
import { Sheet } from '../components/ui/Sheet';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Chip, Divider, EmptyState, Segmented } from '../components/ui/misc';
import { Txt } from '../components/ui/Txt';
import { addBookmark, removeBookmark, updateBookmarkNote, useBookmarks, type Bookmark } from '../lib/library';
import { updateReaderSettings, useSettings, type ReaderTint } from '../lib/settings';
import { relativeDay } from '../lib/format';
import { fonts, radius, useTheme } from '../theme';

/* ---------------- Display settings ---------------- */

export function ReaderSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const s = useSettings((x) => x.reader);

  return (
    <Sheet visible={visible} onClose={onClose} title="ކިޔާ ގޮތް">
      <View style={{ gap: 18, paddingBottom: 8 }}>
        <Group label="ސަފްޙާ ބަދަލުވާ ގޮތް">
          <Segmented
            value={s.mode}
            onChange={(mode) => updateReaderSettings({ mode })}
            options={[
              { value: 'vertical', label: 'ތިރިއަށް ސްކްރޯލް', icon: 'swap-vertical' },
              { value: 'horizontal', label: 'ސަފްޙާއިން ސަފްޙާއަށް', icon: 'swap-horizontal' },
            ]}
          />
          {s.mode === 'horizontal' && Platform.OS === 'ios' && (
            <Row label="ކަނާތުން ވާތަށް (ދިވެހި ފޮތް)" icon="arrow-back">
              <Switch value={s.rtl} onValueChange={(rtl) => updateReaderSettings({ rtl })} trackColor={{ true: t.primary }} />
            </Row>
          )}
        </Group>

        <Group label="ސަފްޙާ ފިޓްވާ ގޮތް">
          <Segmented
            value={String(s.fit) as '0' | '1' | '2'}
            onChange={(v) => updateReaderSettings({ fit: Number(v) as 0 | 1 | 2 })}
            options={[
              { value: '0', label: 'ފުޅާމިނަށް', icon: 'resize' },
              { value: '2', label: 'މުޅި ސަފްޙާ', icon: 'expand' },
            ]}
          />
        </Group>

        <Group label="ކުލަ">
          <View style={styles.tints}>
            {(
              [
                { value: 'none', label: 'އާދައިގެ', swatch: '#FFFFFF' },
                { value: 'sepia', label: 'ހޫނު', swatch: '#F3E3C3' },
                { value: 'night', label: 'ރޭގަނޑު', swatch: '#2A2730' },
              ] as { value: ReaderTint; label: string; swatch: string }[]
            ).map((o) => {
              const active = s.tint === o.value;
              return (
                <PressableScale
                  key={o.value}
                  haptic
                  onPress={() => updateReaderSettings({ tint: o.value })}
                  style={[styles.tint, { borderColor: active ? t.primary : t.border, backgroundColor: t.surfaceAlt }]}
                >
                  <View style={[styles.swatch, { backgroundColor: o.swatch, borderColor: t.border }]}>
                    {active && <Ionicons name="checkmark" size={16} color={o.value === 'night' ? '#fff' : '#000'} />}
                  </View>
                  <Txt variant="caption" color={active ? t.primary : t.text}>
                    {o.label}
                  </Txt>
                </PressableScale>
              );
            })}
          </View>
          <Row label="އަލި ކުޑަކުރުން" icon="sunny-outline">
            <Slider
              style={{ flex: 1, maxWidth: 200 }}
              minimumValue={0}
              maximumValue={0.6}
              value={s.dim}
              onSlidingComplete={(dim) => updateReaderSettings({ dim })}
              minimumTrackTintColor={t.primary}
              maximumTrackTintColor={t.border}
              thumbTintColor={t.primary}
            />
          </Row>
        </Group>

        <Group label="އެހެނިހެން">
          <Row label="ކިޔަމުންދާއިރު ސްކްރީން ނިއްވާނުލާ" icon="phone-portrait-outline">
            <Switch value={s.keepAwake} onValueChange={(keepAwake) => updateReaderSettings({ keepAwake })} trackColor={{ true: t.primary }} />
          </Row>
          <Divider />
          <Row label="ސްކްރީން އެނބުރުން ހުއްޓާލާ" icon="lock-closed-outline">
            <Switch
              value={s.lockOrientation}
              onValueChange={(lockOrientation) => updateReaderSettings({ lockOrientation })}
              trackColor={{ true: t.primary }}
            />
          </Row>
        </Group>
      </View>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="label" tone="muted">
        {label}
      </Txt>
      {children}
    </View>
  );
}

function Row({ label, icon, children }: { label: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={t.textMuted} />
      <Txt variant="bodySmall" style={{ flex: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}

/* ---------------- Bookmarks ---------------- */

export function BookmarksSheet({
  visible,
  onClose,
  uuid,
  page,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  uuid: string;
  page: number;
  onJump: (page: number) => void;
}) {
  const bookmarks = useBookmarks(uuid);
  return (
    <Sheet visible={visible} onClose={onClose} title="ބުކްމާކްތައް" subtitle={`${bookmarks.length} ބުކްމާކް`}>
      {/* Input state lives inside the sheet content so typing is never a render behind. */}
      <BookmarksContent uuid={uuid} page={page} onJump={onJump} onClose={onClose} />
    </Sheet>
  );
}

function BookmarksContent({ uuid, page, onJump, onClose }: { uuid: string; page: number; onJump: (page: number) => void; onClose: () => void }) {
  const t = useTheme();
  const bookmarks = useBookmarks(uuid);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const current = bookmarks.find((b) => b.page === page);

  return (
    <>
      {!current ? (
        <View style={[styles.addCard, { backgroundColor: t.primarySoft }]}>
          <Txt variant="label" tone="primary">{`ސަފްޙާ ${page} ބުކްމާކް ކުރައްވާ`}</Txt>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="ނޯޓެއް (އިޚްތިޔާރީ)"
            placeholderTextColor={t.textFaint}
            style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.border, fontFamily: fonts.faseyha }]}
            maxLength={140}
          />
          <Button
            title="ބުކްމާކް ކުރޭ"
            icon="bookmark"
            size="sm"
            onPress={() => {
              addBookmark(uuid, page, note);
              setNote('');
            }}
          />
        </View>
      ) : null}

      {bookmarks.length === 0 ? (
        <EmptyState icon="bookmark-outline" title="އަދި ބުކްމާކެއް ނެތް" message="މުހިންމު ސަފްޙާތައް ބުކްމާކްކޮށްގެން ފަސޭހައިން އެނބުރި ދެވޭނެ" />
      ) : (
        <View style={{ marginTop: 12 }}>
          {bookmarks.map((b) => (
            <Animated.View key={b.id} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
              <BookmarkRow
                bookmark={b}
                active={b.page === page}
                editing={editing === b.id}
                editText={editText}
                onEditText={setEditText}
                onStartEdit={() => {
                  setEditing(b.id);
                  setEditText(b.note ?? '');
                }}
                onSaveEdit={() => {
                  updateBookmarkNote(uuid, b.id, editText);
                  setEditing(null);
                }}
                onJump={() => {
                  onJump(b.page);
                  onClose();
                }}
                onDelete={() => removeBookmark(uuid, b.id)}
              />
              <Divider inset={56} />
            </Animated.View>
          ))}
        </View>
      )}
    </>
  );
}

function BookmarkRow({
  bookmark,
  active,
  editing,
  editText,
  onEditText,
  onStartEdit,
  onSaveEdit,
  onJump,
  onDelete,
}: {
  bookmark: Bookmark;
  active: boolean;
  editing: boolean;
  editText: string;
  onEditText: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onJump: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  return (
    <PressableScale onPress={onJump} scaleTo={0.98} style={styles.bookmark}>
      <View style={[styles.pageBadge, { backgroundColor: active ? t.primary : t.primarySoft }]}>
        <Txt variant="numSmall" ltr color={active ? t.onPrimary : t.primary}>
          {bookmark.page}
        </Txt>
      </View>
      <View style={{ flex: 1 }}>
        {editing ? (
          <TextInput
            value={editText}
            onChangeText={onEditText}
            autoFocus
            onSubmitEditing={onSaveEdit}
            onBlur={onSaveEdit}
            returnKeyType="done"
            placeholder="ނޯޓް"
            placeholderTextColor={t.textFaint}
            style={[styles.input, { color: t.text, backgroundColor: t.surfaceAlt, borderColor: t.border, fontFamily: fonts.faseyha }]}
          />
        ) : (
          <>
            <Txt variant="subheading" numberOfLines={2}>
              {bookmark.note || `ސަފްޙާ ${bookmark.page}`}
            </Txt>
            <Txt variant="caption" tone="muted">
              {relativeDay(bookmark.createdAt)}
            </Txt>
          </>
        )}
      </View>
      {!editing && (
        <PressableScale hitSlop={8} onPress={onStartEdit} style={styles.rowIcon}>
          <Ionicons name="pencil-outline" size={18} color={t.textMuted} />
        </PressableScale>
      )}
      <PressableScale hitSlop={8} onPress={onDelete} style={styles.rowIcon}>
        <Ionicons name="trash-outline" size={18} color={t.danger} />
      </PressableScale>
    </PressableScale>
  );
}

/* ---------------- Go to page ---------------- */

export function GoToPageSheet({
  visible,
  onClose,
  total,
  page,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  total: number;
  page: number;
  onJump: (page: number) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="ސަފްޙާއަކަށް ދާ" subtitle={`މިހާރު ސަފްޙާ ${page} / ${total}`}>
      <GoToContent total={total} onJump={onJump} onClose={onClose} />
    </Sheet>
  );
}

function GoToContent({ total, onJump, onClose }: { total: number; onJump: (page: number) => void; onClose: () => void }) {
  const t = useTheme();
  const [value, setValue] = useState('');
  const n = parseInt(value, 10);
  const valid = Number.isFinite(n) && n >= 1 && n <= total;

  const go = (p: number) => {
    onJump(p);
    setValue('');
    onClose();
  };

  return (
    <View style={{ gap: 12 }}>
      <TextInput
        value={value}
        onChangeText={(v) => setValue(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        autoFocus
        placeholder={`1 - ${total}`}
        placeholderTextColor={t.textFaint}
        onSubmitEditing={() => valid && go(n)}
        style={[styles.pageInput, { color: t.text, backgroundColor: t.surfaceAlt, borderColor: valid || !value ? t.border : t.danger }]}
        maxLength={5}
      />
      <View style={styles.quick}>
        <Chip label="ފުރަތަމަ ސަފްޙާ" icon="play-skip-forward-outline" onPress={() => go(1)} />
        <Chip label="ފަހު ސަފްޙާ" icon="play-skip-back-outline" onPress={() => go(total)} />
      </View>
      <Button title="ދާ" icon="arrow-back" onPress={() => go(n)} disabled={!valid} />
    </View>
  );
}

/* ---------------- Table of contents ---------------- */

type FlatToc = { key: string; title: string; page: number; depth: number };

function flattenToc(items: TableContent[] | undefined, depth = 0, out: FlatToc[] = []): FlatToc[] {
  items?.forEach((item, i) => {
    out.push({ key: `${depth}-${i}-${item.pageIdx}-${item.title}`, title: item.title, page: (item.pageIdx ?? 0) + 1, depth });
    if (item.children?.length) flattenToc(item.children, depth + 1, out);
  });
  return out;
}

export function TocSheet({
  visible,
  onClose,
  toc,
  page,
  onJump,
}: {
  visible: boolean;
  onClose: () => void;
  toc?: TableContent[];
  page: number;
  onJump: (page: number) => void;
}) {
  const t = useTheme();
  const flat = useMemo(() => flattenToc(toc), [toc]);
  const currentIndex = useMemo(() => {
    let idx = -1;
    flat.forEach((f, i) => {
      if (f.page <= page) idx = i;
    });
    return idx;
  }, [flat, page]);

  return (
    <Sheet visible={visible} onClose={onClose} title="ފިހުރިސްތު" scroll={false}>
      {flat.length === 0 ? (
        <EmptyState icon="list-outline" title="މި ފޮތުގައި ފިހުރިސްތެއް ނެތް" />
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(i) => i.key}
          style={{ maxHeight: 520 }}
          initialScrollIndex={currentIndex > 3 ? currentIndex - 2 : undefined}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => (
            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                onJump(item.page);
                onClose();
              }}
              style={[styles.tocRow, { paddingStart: 8 + item.depth * 16, backgroundColor: index === currentIndex ? t.primarySoft : 'transparent' }]}
            >
              <Txt variant={item.depth === 0 ? 'subheading' : 'bodySmall'} style={{ flex: 1 }} numberOfLines={2} color={index === currentIndex ? t.primary : t.text}>
                {item.title}
              </Txt>
              <Txt variant="numSmall" ltr tone="muted">
                {item.page}
              </Txt>
            </PressableScale>
          )}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  tints: { flexDirection: 'row', gap: 10 },
  tint: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addCard: { padding: 12, borderRadius: radius.lg, gap: 10 },
  input: { height: 44, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, writingDirection: 'rtl' },
  bookmark: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  pageBadge: { minWidth: 44, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  rowIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pageInput: { height: 60, borderRadius: radius.lg, borderWidth: 1.5, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  quick: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  tocRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingEnd: 8, borderRadius: radius.md },
});
