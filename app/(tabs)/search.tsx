import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BookGrid } from '@/src/components/book/BookGrid';
import { GenreChip } from '@/src/components/book/bits';
import { Chip, SectionHeading } from '@/src/components/ui/misc';
import { PressableScale } from '@/src/components/ui/PressableScale';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { Txt } from '@/src/components/ui/Txt';
import { useGenres } from '@/src/hooks/queries';
import { useBottomSpace } from '@/src/hooks/useBottomSpace';
import { clearRecentSearches, pushRecentSearch, useSettings } from '@/src/lib/settings';
import { fonts, radius, useTheme } from '@/src/theme';

export default function Search() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = useBottomSpace(true);
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const genres = useGenres(40);
  const recent = useSettings((s) => s.recentSearches);

  useEffect(() => {
    const q = input.trim();
    const id = setTimeout(() => setQuery(q), q ? 450 : 0);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    if (query.length < 2) return;
    const id = setTimeout(() => pushRecentSearch(query), 1500);
    return () => clearTimeout(id);
  }, [query]);

  const searching = query.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.top}>
        <Txt variant="display">ހޯދާ</Txt>
        <View style={[styles.field, { backgroundColor: t.surface, borderColor: focused ? t.primary : t.border }]}>
          <Ionicons name="search" size={20} color={focused ? t.primary : t.textFaint} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => {
              setQuery(input.trim());
              pushRecentSearch(input);
            }}
            placeholder="ފޮތެއް، ލިޔުންތެރިއެއް ނުވަތަ ISBN"
            placeholderTextColor={t.textFaint}
            returnKeyType="search"
            keyboardType={Platform.OS === 'ios' ? 'web-search' : 'default'}
            autoCorrect={false}
            style={[styles.input, { color: t.text, fontFamily: fonts.faseyha }]}
            selectionColor={t.primary}
          />
          {input.length > 0 && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <PressableScale
                hitSlop={10}
                onPress={() => {
                  setInput('');
                  inputRef.current?.focus();
                }}
              >
                <Ionicons name="close-circle" size={20} color={t.textFaint} />
              </PressableScale>
            </Animated.View>
          )}
        </View>
      </View>

      {searching ? (
        <BookGrid
          queryKey={['search', query]}
          endpoint="/books"
          filters={{ search: query }}
          scope="search"
          bottomInset={bottom}
          emptyTitle={`"${query}" އާ ގުޅޭ އެއްވެސް ފޮތެއް ނުފެނުނު`}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={{ paddingBottom: bottom, paddingTop: 8 }}
        >
          {recent.length > 0 && (
            <Animated.View entering={FadeIn} style={{ marginBottom: 18 }}>
              <SectionHeading title="ފަހުން ހޯދި" actionLabel="ފޮހެލާ" onAction={clearRecentSearches} />
              <View style={styles.wrap}>
                {recent.map((term) => (
                  <Chip key={term} label={term} icon="time-outline" onPress={() => setInput(term)} />
                ))}
              </View>
            </Animated.View>
          )}
          <SectionHeading title="ކެޓަގަރީތައް" />
          <View style={styles.wrap}>
            {genres.isLoading
              ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} width={70 + ((i * 23) % 50)} height={36} radius={18} />)
              : genres.data?.map((g) => <GenreChip key={g.id} genre={g} />)}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 16, writingDirection: 'rtl', paddingVertical: 0 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
});
