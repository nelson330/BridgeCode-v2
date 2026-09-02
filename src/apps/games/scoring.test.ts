import { describe, expect, it } from 'bun:test'
import { isAnswerCorrect } from '@shared/contracts/exercises'

describe('isAnswerCorrect - Exercise Types Validation', () => {
  describe('Multiple Choice (mc)', () => {
    it('returns true when submitted correctIndex matches correctIndex in answerJson', () => {
      const correct = isAnswerCorrect('mc', '{"correctIndex": 2}', '{"correctIndex": 2}')
      expect(correct).toBe(true)
    })

    it('returns false when submitted correctIndex is wrong', () => {
      const correct = isAnswerCorrect('mc', '{"correctIndex": 1}', '{"correctIndex": 2}')
      expect(correct).toBe(false)
    })
  })

  describe('True / False (tf)', () => {
    it('returns true when isTrue matches', () => {
      expect(isAnswerCorrect('tf', '{"isTrue": true}', '{"isTrue": true}')).toBe(true)
      expect(isAnswerCorrect('tf', '{"isTrue": false}', '{"isTrue": false}')).toBe(true)
    })

    it('returns false when isTrue does not match', () => {
      expect(isAnswerCorrect('tf', '{"isTrue": false}', '{"isTrue": true}')).toBe(false)
    })
  })

  describe('Fill in the blank (fill)', () => {
    it('returns true when chosen word matches validAnswers (case-insensitive and trimmed)', () => {
      const ansJson = JSON.stringify({ validAnswers: ['Fotosíntesis', 'fotosintesis'] })
      expect(isAnswerCorrect('fill', JSON.stringify({ text: 'fotosíntesis' }), ansJson)).toBe(true)
      expect(isAnswerCorrect('fill', JSON.stringify({ text: ' FOTOSINTESIS ' }), ansJson)).toBe(true)
    })

    it('returns false when chosen distractor word is wrong', () => {
      const ansJson = JSON.stringify({ validAnswers: ['Fotosíntesis'] })
      expect(isAnswerCorrect('fill', JSON.stringify({ text: 'Respiración' }), ansJson)).toBe(false)
    })
  })

  describe('Order sequence (order)', () => {
    it('returns true when order array matches correctOrder exactly', () => {
      const ansJson = JSON.stringify({ correctOrder: [2, 0, 1, 3] })
      expect(isAnswerCorrect('order', JSON.stringify({ correctOrder: [2, 0, 1, 3] }), ansJson)).toBe(true)
    })

    it('returns false when order array is inverted or wrong', () => {
      const ansJson = JSON.stringify({ correctOrder: [0, 1, 2] })
      expect(isAnswerCorrect('order', JSON.stringify({ correctOrder: [2, 1, 0] }), ansJson)).toBe(false)
    })
  })

  describe('Match pairs (match)', () => {
    it('returns true when all concept pairs match correctly regardless of submission order', () => {
      const correctAns = JSON.stringify({
        pairs: [
          { left: 'Mitocondria', right: 'Energía' },
          { left: 'Cloroplasto', right: 'Fotosíntesis' },
          { left: 'Núcleo', right: 'ADN' },
        ],
      })

      // Submitted in different order but correct mappings
      const submitted = JSON.stringify({
        pairs: [
          { left: 'Núcleo', right: 'ADN' },
          { left: 'Cloroplasto', right: 'Fotosíntesis' },
          { left: 'Mitocondria', right: 'Energía' },
        ],
      })

      expect(isAnswerCorrect('match', submitted, correctAns)).toBe(true)
    })

    it('returns false when any pair definition is mismatched', () => {
      const correctAns = JSON.stringify({
        pairs: [
          { left: 'Mitocondria', right: 'Energía' },
          { left: 'Cloroplasto', right: 'Fotosíntesis' },
        ],
      })

      const submitted = JSON.stringify({
        pairs: [
          { left: 'Mitocondria', right: 'Fotosíntesis' },
          { left: 'Cloroplasto', right: 'Energía' },
        ],
      })

      expect(isAnswerCorrect('match', submitted, correctAns)).toBe(false)
    })
  })

  describe('Slider (slider)', () => {
    it('returns true when submitted value is within tolerance', () => {
      const ansJson = JSON.stringify({ min: 0, max: 100, correctValue: 50, tolerance: 5 })
      expect(isAnswerCorrect('slider', JSON.stringify({ value: 50 }), ansJson)).toBe(true)
      expect(isAnswerCorrect('slider', JSON.stringify({ value: 54 }), ansJson)).toBe(true)
      expect(isAnswerCorrect('slider', JSON.stringify({ value: 46 }), ansJson)).toBe(true)
    })

    it('returns false when submitted value is outside tolerance', () => {
      const ansJson = JSON.stringify({ min: 0, max: 100, correctValue: 50, tolerance: 5 })
      expect(isAnswerCorrect('slider', JSON.stringify({ value: 58 }), ansJson)).toBe(false)
      expect(isAnswerCorrect('slider', JSON.stringify({ value: 40 }), ansJson)).toBe(false)
    })
  })

  describe('Pin Drop (pin_drop)', () => {
    it('returns true when coordinate is within euclidean distance tolerance', () => {
      const ansJson = JSON.stringify({ x: 100, y: 100, tolerance: 20 })
      expect(isAnswerCorrect('pin_drop', JSON.stringify({ x: 105, y: 105 }), ansJson)).toBe(true)
    })

    it('returns false when coordinate is too far from target', () => {
      const ansJson = JSON.stringify({ x: 100, y: 100, tolerance: 10 })
      expect(isAnswerCorrect('pin_drop', JSON.stringify({ x: 150, y: 150 }), ansJson)).toBe(false)
    })
  })

  describe('Word Cloud & Slide (word_cloud, slide)', () => {
    it('returns true for word_cloud with any submitted text', () => {
      expect(isAnswerCorrect('word_cloud', JSON.stringify({ text: 'Innovación' }), '{}')).toBe(true)
    })

    it('returns true for slide with any submission', () => {
      expect(isAnswerCorrect('slide', '{}', '{}')).toBe(true)
    })
  })
})
