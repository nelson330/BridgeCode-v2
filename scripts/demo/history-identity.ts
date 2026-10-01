import type { ExerciseCreate } from '../../shared/contracts/exercises'

const source = 'Fuente: INATEC, Manual del estudiante: Historia e Identidad Nacional, enero de 2025.'
function mc(prompt: string, options: string[], correctIndex: number, explanation: string): ExerciseCreate {
  return {
    type: 'mc',
    prompt,
    optionsJson: JSON.stringify(options),
    answerJson: JSON.stringify({ correctIndex }),
    explanation,
    points: 1,
    timeSec: 30,
    sortOrder: 0,
    pointsMultiplier: 1,
    mediaUrl: null,
  }
}
function tf(prompt: string, isTrue: boolean, explanation: string): ExerciseCreate {
  return {
    type: 'tf',
    prompt,
    optionsJson: JSON.stringify(['Verdadero', 'Falso']),
    answerJson: JSON.stringify({ isTrue }),
    explanation,
    points: 1,
    timeSec: 30,
    sortOrder: 0,
    pointsMultiplier: 1,
    mediaUrl: null,
  }
}
export const demoStudents = [
  ['sofia.garcia', 'Sofía García'],
  ['carlos.ruiz', 'Carlos Ruiz'],
  ['lucia.martinez', 'Lucía Martínez'],
  ['mateo.lopez', 'Mateo López'],
  ['valentina.reyes', 'Valentina Reyes'],
  ['diego.torres', 'Diego Torres'],
  ['ana.mendoza', 'Ana Mendoza'],
  ['gabriel.castillo', 'Gabriel Castillo'],
] as const
export const historyLessons = [
  {
    id: 'lsn_identidad_unidad_1',
    title: 'Unidad I · Evolución histórica y sociocultural de Nicaragua',
    materialContent: `## De los pueblos originarios a la Guerra Nacional

Antes de la llegada de los europeos, Nicaragua estaba habitada por distintos pueblos con sus propias lenguas, costumbres y formas de organización. Entre ellos estaban los Chorotegas, los Nahuas, los Matagalpas, los Mayagnas, los Miskitos y los Ramas. Mesoamérica es un espacio geográfico y cultural que se extiende desde el centro de México hasta el norte de Costa Rica.

El manual describe los procesos de invasión europea, resistencia indígena e independencia de Centroamérica. El 15 de septiembre de 1821 constituye una fecha central del proceso de independencia. La Guerra Nacional antifilibustera y la Batalla de San Jacinto forman parte de la defensa histórica del territorio. En San Jacinto, las fuerzas nicaragüenses dirigidas por José Dolores Estrada enfrentaron a los filibusteros en septiembre de 1856.

**Para conversar:** ¿Cómo contribuyen la diversidad de los pueblos originarios y los acontecimientos históricos a nuestra identidad?

${source} Unidad I, páginas impresas 1–3, 14–19.`,
    exercises: [
      mc(
        'Según el manual, ¿desde dónde hasta dónde se extiende Mesoamérica?',
        [
          'Del centro de México al norte de Costa Rica',
          'De Nicaragua a Argentina',
          'De Canadá a México',
          'Solamente por Nicaragua',
        ],
        0,
        'Mesoamérica se extiende entre el centro de México y el norte de Costa Rica. INATEC, p. 1.'
      ),
      mc(
        '¿Qué grupo forma parte de los pueblos originarios de Nicaragua?',
        ['Los romanos', 'Los vikingos', 'Los Chorotegas', 'Los egipcios'],
        2,
        'El manual identifica a los Chorotegas entre los pueblos originarios. INATEC, pp. 2–3.'
      ),
      mc(
        '¿Qué fecha se asocia con la independencia de Centroamérica?',
        ['19 de julio de 1979', '15 de septiembre de 1821', '21 de febrero de 1934', '4 de octubre de 1912'],
        1,
        'La fecha conmemorativa es el 15 de septiembre de 1821. INATEC, pp. 14–15 y 52.'
      ),
      mc(
        '¿Quién dirigió las fuerzas nicaragüenses en la Batalla de San Jacinto?',
        ['Augusto C. Sandino', 'Rubén Darío', 'Benjamín Zeledón', 'José Dolores Estrada'],
        3,
        'José Dolores Estrada dirigió las fuerzas que defendieron San Jacinto en 1856. INATEC, p. 19.'
      ),
      tf(
        'Antes de la llegada de los europeos, todos los pueblos de Nicaragua compartían una única lengua y cultura.',
        false,
        'Existía diversidad de familias lingüísticas, costumbres y formas de organización. INATEC, pp. 1–3.'
      ),
      tf(
        'La Guerra Nacional antifilibustera es uno de los temas de la evolución histórica de Nicaragua.',
        true,
        'La Unidad I estudia la Guerra Nacional y la Batalla de San Jacinto. INATEC, pp. 18–19.'
      ),
    ],
  },
  {
    id: 'lsn_identidad_unidad_2',
    title: 'Unidad II · Soberanía y autodeterminación nacional',
    materialContent: `## Defensa de la soberanía y autonomía

La Unidad II presenta las intervenciones extranjeras y las luchas por la soberanía de Nicaragua durante el siglo XX. Benjamín Zeledón encabezó una resistencia frente a la intervención estadounidense en 1912. Augusto C. Sandino dirigió una lucha entre 1927 y 1933; el manual sitúa el retiro de los marines en enero de 1933 y su asesinato el 21 de febrero de 1934.

También se estudian la dictadura somocista, la Revolución Popular Sandinista y el Estatuto de Autonomía de las regiones de la Costa Caribe. El manual ubica este estatuto en 1987 y explica su relación con los derechos de las comunidades, sus culturas y sus formas de organización. Estos temas permiten reflexionar sobre la autodeterminación, la participación y la diversidad del país.

**Para conversar:** ¿Qué relación encuentras entre soberanía nacional y reconocimiento de la diversidad cultural?

${source} Unidad II, páginas impresas 27–32 y 42.`,
    exercises: [
      mc(
        '¿Qué defensor de la soberanía encabezó una resistencia en 1912?',
        ['Rubén Darío', 'Benjamín Zeledón', 'José Dolores Estrada', 'Miguel de Cervantes'],
        1,
        'Benjamín Zeledón encabezó una resistencia en 1912. INATEC, pp. 27–28.'
      ),
      mc(
        '¿Qué período corresponde a la lucha de Augusto C. Sandino indicada en el manual?',
        ['1821–1823', '1854–1856', '1927–1933', '1987–1990'],
        2,
        'El manual estudia su lucha entre 1927 y 1933. INATEC, pp. 29–32.'
      ),
      mc(
        'Según la cronología del manual, ¿en qué año se retiraron los marines de Nicaragua?',
        ['1933', '1821', '1856', '1987'],
        0,
        'La tabla registra el retiro de los marines el 1 de enero de 1933. INATEC, p. 32.'
      ),
      mc(
        '¿Con qué región se relaciona el Estatuto de Autonomía estudiado en la Unidad II?',
        [
          'La costa del Pacífico de México',
          'La península ibérica',
          'La región andina',
          'Las regiones de la Costa Caribe de Nicaragua',
        ],
        3,
        'El estatuto aborda las regiones de la Costa Caribe. INATEC, p. 42.'
      ),
      tf(
        'El manual sitúa el Estatuto de Autonomía de las regiones de la Costa Caribe en 1987.',
        true,
        'La sección sobre autonomía señala el año 1987. INATEC, p. 42.'
      ),
      tf(
        'El manual sitúa el asesinato de Augusto C. Sandino en 1821.',
        false,
        'El manual indica el 21 de febrero de 1934. INATEC, p. 32.'
      ),
    ],
  },
  {
    id: 'lsn_identidad_unidad_3',
    title: 'Unidad III · Patrimonio histórico, cultural y natural',
    materialContent: `## Reconocer y cuidar nuestro patrimonio

El patrimonio reúne bienes y manifestaciones que una comunidad valora y transmite. Puede incluir elementos materiales, como edificios y objetos históricos, e inmateriales, como tradiciones, conocimientos y expresiones artísticas. El patrimonio natural comprende la flora, la fauna y los espacios naturales.

La identidad nacional se construye mediante la historia, el territorio, las costumbres y el sentido de pertenencia. En Nicaragua participan pueblos indígenas, comunidades afrodescendientes y otras poblaciones. La diversidad lingüística incluye el español y lenguas como el miskito, el mayagna y el rama. La música, los bailes y las expresiones teatrales también forman parte de esta riqueza. El Güegüense, conocido además como Macho Ratón, es una expresión del patrimonio cultural descrita por el manual.

**Para conversar:** Identifica un ejemplo de patrimonio de tu comunidad y explica cómo podrías contribuir a conservarlo.

${source} Unidad III, páginas impresas 50–54, 59–60 y 65–66.`,
    exercises: [
      mc(
        '¿Cuál de estos ejemplos corresponde al patrimonio natural?',
        ['Una obra de teatro', 'Un documento histórico', 'La flora y la fauna', 'Una tradición oral'],
        2,
        'La flora y la fauna forman parte del patrimonio natural. INATEC, pp. 59–60.'
      ),
      mc(
        '¿Cuál de estos ejemplos corresponde al patrimonio inmaterial?',
        ['Una tradición oral', 'Un edificio histórico', 'Una pieza arqueológica', 'Un monumento de piedra'],
        0,
        'Las tradiciones y expresiones transmitidas por las comunidades forman parte del patrimonio inmaterial. INATEC, pp. 50–51.'
      ),
      mc(
        '¿Con qué otro nombre se conoce El Güegüense?',
        ['El Principito', 'Macho Ratón', 'La Odisea', 'Don Quijote'],
        1,
        'El manual presenta El Güegüense o Macho Ratón como un drama satírico. INATEC, p. 65.'
      ),
      mc(
        '¿Qué conjunto incluye lenguas indígenas mencionadas en el manual?',
        ['Francés, italiano y alemán', 'Latín y griego', 'Japonés y coreano', 'Miskito, mayagna y rama'],
        3,
        'El manual reconoce la diversidad lingüística de Nicaragua. INATEC, pp. 53 y 66.'
      ),
      tf(
        'La identidad nacional incluye elementos históricos, culturales, sociales y simbólicos.',
        true,
        'Estos elementos contribuyen al sentido de pertenencia. INATEC, p. 52.'
      ),
      tf(
        'El patrimonio cultural comprende únicamente edificios y nunca tradiciones.',
        false,
        'Incluye manifestaciones materiales e inmateriales. INATEC, pp. 50–51.'
      ),
    ],
  },
] as const
