// src/components/FlavorWheel.tsx

import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import Svg, {
  G,
  Path,
  Text as SvgText,
  Circle,
} from 'react-native-svg';

import { FlavorAttribute } from '../types/domain';

interface FlavorWheelProps {
  attributes: FlavorAttribute[];
  selectedIntensities: Record<string, number>;
  onChangeIntensity: (attributeId: string, intensity: number) => void;
}

interface Segment {
  attr: FlavorAttribute;
  startAngle: number;
  endAngle: number;
  color: string;
  hasChildren: boolean;
}

const ROOT_COLORS = [
  '#8E5A9F',
  '#56438F',
  '#E16050',
  '#5B3A2E',
  '#D08A45',
  '#6B3E25',
  '#8A7A68',
  '#9C6654',
  '#808080',
  '#B66B2A',
  '#C7A36A',
  '#4E8A5A',
  '#3E7154',
];

const WHEEL_SIZE_LIMIT = 620;

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
) {
  const angleInRadians = ((angle - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function getTextPosition(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const midAngle = (startAngle + endAngle) / 2;
  return polarToCartesian(cx, cy, radius, midAngle);
}

function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}

export function FlavorWheel({
  attributes,
  selectedIntensities,
  onChangeIntensity,
}: FlavorWheelProps) {
  const { width } = useWindowDimensions();

  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [activeAttributeId, setActiveAttributeId] = useState<string | null>(
    null
  );

  const size = Math.min(width - 28, WHEEL_SIZE_LIMIT);
  const cx = size / 2;
  const cy = size / 2;

  const innerRadius = size * 0.22;
  const outerRadius = size * 0.46;

  const attributesById = useMemo(() => {
    const map: Record<string, FlavorAttribute> = {};

    for (const attr of attributes) {
      map[attr.id] = attr;
    }

    return map;
  }, [attributes]);

  const childrenByParent = useMemo(() => {
    const map: Record<string, FlavorAttribute[]> = {};

    for (const attr of attributes) {
      const parentKey = attr.parentId ?? '__root__';

      if (!map[parentKey]) {
        map[parentKey] = [];
      }

      map[parentKey].push(attr);
    }

    return map;
  }, [attributes]);

  const currentItems = useMemo(() => {
    const key = currentParentId ?? '__root__';
    return childrenByParent[key] ?? [];
  }, [childrenByParent, currentParentId]);

  const currentParent = currentParentId ? attributesById[currentParentId] : null;

  const breadcrumb = useMemo(() => {
    const result: FlavorAttribute[] = [];
    let cursor = currentParent;

    while (cursor) {
      result.unshift(cursor);

      if (!cursor.parentId) break;

      cursor = attributesById[cursor.parentId] ?? null;
    }

    return result;
  }, [attributesById, currentParent]);

  const activeAttribute = activeAttributeId
    ? attributesById[activeAttributeId] ?? null
    : null;

  const activeIntensity = activeAttribute
    ? selectedIntensities[activeAttribute.id] ?? 0
    : 0;

  const currentRootColorIndex = useMemo(() => {
    const rootId = breadcrumb[0]?.id;

    if (!rootId) return 0;

    const roots = childrenByParent.__root__ ?? [];
    const index = roots.findIndex((item) => item.id === rootId);

    return index >= 0 ? index : 0;
  }, [breadcrumb, childrenByParent]);

  const segments = useMemo(() => {
    const anglePerItem = 360 / Math.max(currentItems.length, 1);

    return currentItems.map((attr, index): Segment => {
      const hasChildren = (childrenByParent[attr.id] ?? []).length > 0;

      const color =
        currentParentId === null
          ? ROOT_COLORS[index % ROOT_COLORS.length]
          : ROOT_COLORS[currentRootColorIndex % ROOT_COLORS.length];

      return {
        attr,
        startAngle: index * anglePerItem,
        endAngle: (index + 1) * anglePerItem,
        color,
        hasChildren,
      };
    });
  }, [childrenByParent, currentItems, currentParentId, currentRootColorIndex]);

  const selectedAttributes = useMemo(() => {
    return attributes.filter((attr) => {
      return (selectedIntensities[attr.id] ?? 0) > 0;
    });
  }, [attributes, selectedIntensities]);

  function handleSegmentPress(segment: Segment) {
    if (segment.hasChildren) {
      setCurrentParentId(segment.attr.id);
      setActiveAttributeId(null);
      return;
    }

    const currentIntensity = selectedIntensities[segment.attr.id] ?? 0;

    setActiveAttributeId(segment.attr.id);
    onChangeIntensity(segment.attr.id, currentIntensity > 0 ? 0 : 5);
  }

  function goBack() {
    if (!currentParent) return;

    setCurrentParentId(currentParent.parentId);
    setActiveAttributeId(null);
  }

  function goToRoot() {
    setCurrentParentId(null);
    setActiveAttributeId(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CoffeeMind Aroma Wheel</Text>

      <Text style={styles.subtitle}>
        Selecciona una categoría y avanza por sus descriptores relacionados
      </Text>

      <View style={styles.breadcrumbRow}>
        <Pressable style={styles.breadcrumbChip} onPress={goToRoot}>
          <Text style={styles.breadcrumbText}>Inicio</Text>
        </Pressable>

        {breadcrumb.map((item) => (
          <Pressable
            key={item.id}
            style={styles.breadcrumbChip}
            onPress={() => {
              setCurrentParentId(item.id);
              setActiveAttributeId(null);
            }}
          >
            <Text style={styles.breadcrumbText}>{item.name}</Text>
          </Pressable>
        ))}
      </View>

      {currentParent && (
        <Pressable style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>
      )}

      <View style={styles.wheelWrapper}>
        <Svg width={size} height={size}>
          <G>
            {segments.map((segment) => {
              const selected = (selectedIntensities[segment.attr.id] ?? 0) > 0;

              const textPosition = getTextPosition(
                cx,
                cy,
                innerRadius + (outerRadius - innerRadius) * 0.54,
                segment.startAngle,
                segment.endAngle
              );

              const midAngle = (segment.startAngle + segment.endAngle) / 2;

              const rotation =
                midAngle > 90 && midAngle < 270
                  ? midAngle + 90
                  : midAngle - 90;

              return (
                <G key={segment.attr.id}>
                  <Path
                    d={describeArc(
                      cx,
                      cy,
                      innerRadius,
                      outerRadius,
                      segment.startAngle,
                      segment.endAngle
                    )}
                    fill={segment.color}
                    opacity={selected ? 1 : segment.hasChildren ? 0.9 : 0.72}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    onPress={() => handleSegmentPress(segment)}
                  />

                  <SvgText
                    x={textPosition.x}
                    y={textPosition.y}
                    fill="#FFFFFF"
                    fontSize={segments.length > 10 ? 10 : 13}
                    fontWeight="800"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    rotation={rotation}
                    origin={`${textPosition.x}, ${textPosition.y}`}
                  >
                    {truncateLabel(segment.attr.name, segments.length > 10 ? 11 : 16)}
                  </SvgText>
                </G>
              );
            })}

            <Circle
              cx={cx}
              cy={cy}
              r={innerRadius - 8}
              fill="#FAF7F2"
              stroke="#FFFFFF"
              strokeWidth={4}
            />

            <SvgText
              x={cx}
              y={cy - 16}
              textAnchor="middle"
              fill="#3D2B1F"
              fontSize={18}
              fontWeight="800"
            >
              {currentParent ? truncateLabel(currentParent.name, 12) : 'Coffee'}
            </SvgText>

            <SvgText
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fill="#6F4E37"
              fontSize={14}
              fontWeight="800"
            >
              {currentParent ? 'Selecciona' : 'Mind'}
            </SvgText>

            <SvgText
              x={cx}
              y={cy + 32}
              textAnchor="middle"
              fill="#7A6A5C"
              fontSize={10}
              fontWeight="700"
            >
              {currentParent ? 'relacionados' : 'Aroma Wheel'}
            </SvgText>
          </G>
        </Svg>
      </View>

      {activeAttribute ? (
        <View style={styles.selectedPanel}>
          <Text style={styles.selectedLabel}>Descriptor seleccionado</Text>

          <Text style={styles.selectedName}>{activeAttribute.name}</Text>

          <View style={styles.intensityRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <Pressable
                key={level}
                style={[
                  styles.intensityDot,
                  level <= activeIntensity && styles.intensityDotActive,
                ]}
                onPress={() => onChangeIntensity(activeAttribute.id, level)}
              >
                <Text
                  style={[
                    styles.intensityText,
                    level <= activeIntensity && styles.intensityTextActive,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.clearButton}
            onPress={() => onChangeIntensity(activeAttribute.id, 0)}
          >
            <Text style={styles.clearButtonText}>Quitar descriptor</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.selectedPanel}>
          <Text style={styles.selectedLabel}>
            {currentItems.length > 0
              ? 'Toca una sección para avanzar o seleccionar'
              : 'No hay descriptores relacionados'}
          </Text>
        </View>
      )}

      <View style={styles.selectedList}>
        <Text style={styles.selectedListTitle}>Descriptores activos</Text>

        {selectedAttributes.length === 0 ? (
          <Text style={styles.emptySelection}>
            Aún no has seleccionado descriptores.
          </Text>
        ) : (
          <View style={styles.selectedChipWrap}>
            {selectedAttributes.map((attr) => (
              <Pressable
                key={attr.id}
                style={styles.selectedChip}
                onPress={() => {
                  setActiveAttributeId(attr.id);
                  setCurrentParentId(attr.parentId);
                }}
              >
                <Text style={styles.selectedChipText}>
                  {attr.name} · {selectedIntensities[attr.id]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEE6DA',
    marginBottom: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3D2B1F',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 12,
    color: '#7A6A5C',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },

  breadcrumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 8,
  },

  breadcrumbChip: {
    backgroundColor: '#EFE7DA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  breadcrumbText: {
    color: '#3D2B1F',
    fontSize: 11,
    fontWeight: '800',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  backButtonText: {
    color: '#6F4E37',
    fontSize: 13,
    fontWeight: '800',
  },

  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedPanel: {
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EEE6DA',
  },

  selectedLabel: {
    fontSize: 12,
    color: '#7A6A5C',
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  selectedName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3D2B1F',
    marginTop: 2,
    marginBottom: 10,
  },

  intensityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  intensityDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFE7DA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  intensityDotActive: {
    backgroundColor: '#6F4E37',
  },

  intensityText: {
    color: '#3D2B1F',
    fontSize: 11,
    fontWeight: '700',
  },

  intensityTextActive: {
    color: '#FFFFFF',
  },

  clearButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  clearButtonText: {
    color: '#B3261E',
    fontSize: 12,
    fontWeight: '700',
  },

  selectedList: {
    marginTop: 12,
  },

  selectedListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3D2B1F',
    marginBottom: 8,
  },

  selectedChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  selectedChip: {
    backgroundColor: '#6F4E37',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },

  selectedChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  emptySelection: {
    fontSize: 12,
    color: '#7A6A5C',
  },
});