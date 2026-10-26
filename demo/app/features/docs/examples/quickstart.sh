curl -s https://maith98.github.io/oman-events-radar/events.json \
  | jq '.events[] | select(.status == "Upcoming" and .relevance == "High") | {title, start, end, venue}'
