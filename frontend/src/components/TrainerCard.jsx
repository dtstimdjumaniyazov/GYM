import { Link } from 'react-router-dom'

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
  return url
}

function TrainerCard({ trainer }) {
  const photoSrc = toDirectUrl(trainer.photo_url) || trainer.avatar_url

  return (
    <Link
      to={`/trainers/${trainer.id}`}
      className="bg-bg-header/80 rounded-2xl overflow-hidden w-44 sm:w-52 md:w-56 shrink-0 hover:ring-2 hover:ring-link-hover/40 transition-all"
    >
      <div className="h-44 sm:h-52 md:h-56 bg-bg-header flex items-center justify-center">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={trainer.specialization}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl text-link-hover">?</span>
        )}
      </div>
      <div className="p-4 text-text-header">
        <h3 className="font-bold text-lg leading-tight">
          {trainer.first_name} {trainer.last_name}
        </h3>
        <p className="text-link-hover text-sm mt-1">{trainer.specialization}</p>
        <p className="text-sm mt-2 opacity-75">
          {trainer.experience_years} {pluralYears(trainer.experience_years)}
        </p>
      </div>
    </Link>
  )
}

function pluralYears(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'год опыта'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'года опыта'
  return 'лет опыта'
}

export default TrainerCard
