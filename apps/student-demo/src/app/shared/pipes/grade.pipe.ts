import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name:       'grade',
  standalone: true
})
export class GradePipe implements PipeTransform {

  transform(grade: number): string {
    if (grade >= 16) return `${grade}/20 — Très bien`
    if (grade >= 14) return `${grade}/20 — Bien`
    if (grade >= 12) return `${grade}/20 — Assez bien`
    if (grade >= 10) return `${grade}/20 — Passable`
    return `${grade}/20 — Insuffisant`
  }
}