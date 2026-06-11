import { DataSource } from 'typeorm';
import { Team } from '../teams/team.entity';
import { Match } from '../matches/match.entity';
import { User } from '../users/user.entity';
import { UserPrediction } from '../predictions/prediction.entity';
import { Player } from '../players/player.entity';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';


export const seededTeams = [
  {
    "id": "CZE",
    "name": "Czechia",
    "flag": "🇨🇿",
    "group": "A"
  },
  {
    "id": "KOR",
    "name": "South Korea",
    "flag": "🇰🇷",
    "group": "A"
  },
  {
    "id": "MEX",
    "name": "Mexico",
    "flag": "🇲🇽",
    "group": "A"
  },
  {
    "id": "RSA",
    "name": "South Africa",
    "flag": "🇿🇦",
    "group": "A"
  },
  {
    "id": "BIH",
    "name": "Bosnia-Herzegovina",
    "flag": "🇧🇦",
    "group": "B"
  },
  {
    "id": "CAN",
    "name": "Canada",
    "flag": "🇨🇦",
    "group": "B"
  },
  {
    "id": "QAT",
    "name": "Qatar",
    "flag": "🇶🇦",
    "group": "B"
  },
  {
    "id": "SUI",
    "name": "Switzerland",
    "flag": "🇨🇭",
    "group": "B"
  },
  {
    "id": "BRA",
    "name": "Brazil",
    "flag": "🇧🇷",
    "group": "C"
  },
  {
    "id": "HAI",
    "name": "Haiti",
    "flag": "🇭🇹",
    "group": "C"
  },
  {
    "id": "MAR",
    "name": "Morocco",
    "flag": "🇲🇦",
    "group": "C"
  },
  {
    "id": "SCO",
    "name": "Scotland",
    "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "group": "C"
  },
  {
    "id": "AUS",
    "name": "Australia",
    "flag": "🇦🇺",
    "group": "D"
  },
  {
    "id": "PAR",
    "name": "Paraguay",
    "flag": "🇵🇾",
    "group": "D"
  },
  {
    "id": "TUR",
    "name": "Turkey",
    "flag": "🇹🇷",
    "group": "D"
  },
  {
    "id": "USA",
    "name": "United States",
    "flag": "🇺🇸",
    "group": "D"
  },
  {
    "id": "CIV",
    "name": "Ivory Coast",
    "flag": "🇨🇮",
    "group": "E"
  },
  {
    "id": "CUR",
    "name": "Curaçao",
    "flag": "🇨🇼",
    "group": "E"
  },
  {
    "id": "ECU",
    "name": "Ecuador",
    "flag": "🇪🇨",
    "group": "E"
  },
  {
    "id": "GER",
    "name": "Germany",
    "flag": "🇩🇪",
    "group": "E"
  },
  {
    "id": "JPN",
    "name": "Japan",
    "flag": "🇯🇵",
    "group": "F"
  },
  {
    "id": "NED",
    "name": "Netherlands",
    "flag": "🇳🇱",
    "group": "F"
  },
  {
    "id": "SWE",
    "name": "Sweden",
    "flag": "🇸🇪",
    "group": "F"
  },
  {
    "id": "TUN",
    "name": "Tunisia",
    "flag": "🇹🇳",
    "group": "F"
  },
  {
    "id": "BEL",
    "name": "Belgium",
    "flag": "🇧🇪",
    "group": "G"
  },
  {
    "id": "EGY",
    "name": "Egypt",
    "flag": "🇪🇬",
    "group": "G"
  },
  {
    "id": "IRN",
    "name": "Iran",
    "flag": "🇮🇷",
    "group": "G"
  },
  {
    "id": "NZL",
    "name": "New Zealand",
    "flag": "🇳🇿",
    "group": "G"
  },
  {
    "id": "CPV",
    "name": "Cape Verde Islands",
    "flag": "🇨🇻",
    "group": "H"
  },
  {
    "id": "ESP",
    "name": "Spain",
    "flag": "🇪🇸",
    "group": "H"
  },
  {
    "id": "KSA",
    "name": "Saudi Arabia",
    "flag": "🇸🇦",
    "group": "H"
  },
  {
    "id": "URY",
    "name": "Uruguay",
    "flag": "🇺🇾",
    "group": "H"
  },
  {
    "id": "FRA",
    "name": "France",
    "flag": "🇫🇷",
    "group": "I"
  },
  {
    "id": "IRQ",
    "name": "Iraq",
    "flag": "🇮🇶",
    "group": "I"
  },
  {
    "id": "NOR",
    "name": "Norway",
    "flag": "🇳🇴",
    "group": "I"
  },
  {
    "id": "SEN",
    "name": "Senegal",
    "flag": "🇸🇳",
    "group": "I"
  },
  {
    "id": "ALG",
    "name": "Algeria",
    "flag": "🇩🇿",
    "group": "J"
  },
  {
    "id": "ARG",
    "name": "Argentina",
    "flag": "🇦🇷",
    "group": "J"
  },
  {
    "id": "AUT",
    "name": "Austria",
    "flag": "🇦🇹",
    "group": "J"
  },
  {
    "id": "JOR",
    "name": "Jordan",
    "flag": "🇯🇴",
    "group": "J"
  },
  {
    "id": "COD",
    "name": "Congo DR",
    "flag": "🇨🇩",
    "group": "K"
  },
  {
    "id": "COL",
    "name": "Colombia",
    "flag": "🇨🇴",
    "group": "K"
  },
  {
    "id": "POR",
    "name": "Portugal",
    "flag": "🇵🇹",
    "group": "K"
  },
  {
    "id": "UZB",
    "name": "Uzbekistan",
    "flag": "🇺🇿",
    "group": "K"
  },
  {
    "id": "CRO",
    "name": "Croatia",
    "flag": "🇭🇷",
    "group": "L"
  },
  {
    "id": "ENG",
    "name": "England",
    "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "group": "L"
  },
  {
    "id": "GHA",
    "name": "Ghana",
    "flag": "🇬🇭",
    "group": "L"
  },
  {
    "id": "PAN",
    "name": "Panama",
    "flag": "🇵🇦",
    "group": "L"
  }
];

export const seededMatches = [
  {
    "id": "M01",
    "matchNumber": 1,
    "type": "group",
    "group": "A",
    "homeTeamId": "MEX",
    "awayTeamId": "RSA",
    "dateTimeStr": "2026-06-11T19:00:00Z"
  },
  {
    "id": "M02",
    "matchNumber": 2,
    "type": "group",
    "group": "A",
    "homeTeamId": "KOR",
    "awayTeamId": "CZE",
    "dateTimeStr": "2026-06-12T02:00:00Z"
  },
  {
    "id": "M03",
    "matchNumber": 3,
    "type": "group",
    "group": "B",
    "homeTeamId": "CAN",
    "awayTeamId": "BIH",
    "dateTimeStr": "2026-06-12T19:00:00Z"
  },
  {
    "id": "M04",
    "matchNumber": 4,
    "type": "group",
    "group": "D",
    "homeTeamId": "USA",
    "awayTeamId": "PAR",
    "dateTimeStr": "2026-06-13T01:00:00Z"
  },
  {
    "id": "M05",
    "matchNumber": 5,
    "type": "group",
    "group": "B",
    "homeTeamId": "QAT",
    "awayTeamId": "SUI",
    "dateTimeStr": "2026-06-13T19:00:00Z"
  },
  {
    "id": "M06",
    "matchNumber": 6,
    "type": "group",
    "group": "C",
    "homeTeamId": "BRA",
    "awayTeamId": "MAR",
    "dateTimeStr": "2026-06-13T22:00:00Z"
  },
  {
    "id": "M07",
    "matchNumber": 7,
    "type": "group",
    "group": "C",
    "homeTeamId": "HAI",
    "awayTeamId": "SCO",
    "dateTimeStr": "2026-06-14T01:00:00Z"
  },
  {
    "id": "M08",
    "matchNumber": 8,
    "type": "group",
    "group": "D",
    "homeTeamId": "AUS",
    "awayTeamId": "TUR",
    "dateTimeStr": "2026-06-14T04:00:00Z"
  },
  {
    "id": "M09",
    "matchNumber": 9,
    "type": "group",
    "group": "E",
    "homeTeamId": "GER",
    "awayTeamId": "CUR",
    "dateTimeStr": "2026-06-14T17:00:00Z"
  },
  {
    "id": "M10",
    "matchNumber": 10,
    "type": "group",
    "group": "F",
    "homeTeamId": "NED",
    "awayTeamId": "JPN",
    "dateTimeStr": "2026-06-14T20:00:00Z"
  },
  {
    "id": "M11",
    "matchNumber": 11,
    "type": "group",
    "group": "E",
    "homeTeamId": "CIV",
    "awayTeamId": "ECU",
    "dateTimeStr": "2026-06-14T23:00:00Z"
  },
  {
    "id": "M12",
    "matchNumber": 12,
    "type": "group",
    "group": "F",
    "homeTeamId": "SWE",
    "awayTeamId": "TUN",
    "dateTimeStr": "2026-06-15T02:00:00Z"
  },
  {
    "id": "M13",
    "matchNumber": 13,
    "type": "group",
    "group": "H",
    "homeTeamId": "ESP",
    "awayTeamId": "CPV",
    "dateTimeStr": "2026-06-15T16:00:00Z"
  },
  {
    "id": "M14",
    "matchNumber": 14,
    "type": "group",
    "group": "G",
    "homeTeamId": "BEL",
    "awayTeamId": "EGY",
    "dateTimeStr": "2026-06-15T19:00:00Z"
  },
  {
    "id": "M15",
    "matchNumber": 15,
    "type": "group",
    "group": "H",
    "homeTeamId": "KSA",
    "awayTeamId": "URY",
    "dateTimeStr": "2026-06-15T22:00:00Z"
  },
  {
    "id": "M16",
    "matchNumber": 16,
    "type": "group",
    "group": "G",
    "homeTeamId": "IRN",
    "awayTeamId": "NZL",
    "dateTimeStr": "2026-06-16T01:00:00Z"
  },
  {
    "id": "M17",
    "matchNumber": 17,
    "type": "group",
    "group": "I",
    "homeTeamId": "FRA",
    "awayTeamId": "SEN",
    "dateTimeStr": "2026-06-16T19:00:00Z"
  },
  {
    "id": "M18",
    "matchNumber": 18,
    "type": "group",
    "group": "I",
    "homeTeamId": "IRQ",
    "awayTeamId": "NOR",
    "dateTimeStr": "2026-06-16T22:00:00Z"
  },
  {
    "id": "M19",
    "matchNumber": 19,
    "type": "group",
    "group": "J",
    "homeTeamId": "ARG",
    "awayTeamId": "ALG",
    "dateTimeStr": "2026-06-17T01:00:00Z"
  },
  {
    "id": "M20",
    "matchNumber": 20,
    "type": "group",
    "group": "J",
    "homeTeamId": "AUT",
    "awayTeamId": "JOR",
    "dateTimeStr": "2026-06-17T04:00:00Z"
  },
  {
    "id": "M21",
    "matchNumber": 21,
    "type": "group",
    "group": "K",
    "homeTeamId": "POR",
    "awayTeamId": "COD",
    "dateTimeStr": "2026-06-17T17:00:00Z"
  },
  {
    "id": "M22",
    "matchNumber": 22,
    "type": "group",
    "group": "L",
    "homeTeamId": "ENG",
    "awayTeamId": "CRO",
    "dateTimeStr": "2026-06-17T20:00:00Z"
  },
  {
    "id": "M23",
    "matchNumber": 23,
    "type": "group",
    "group": "L",
    "homeTeamId": "GHA",
    "awayTeamId": "PAN",
    "dateTimeStr": "2026-06-17T23:00:00Z"
  },
  {
    "id": "M24",
    "matchNumber": 24,
    "type": "group",
    "group": "K",
    "homeTeamId": "UZB",
    "awayTeamId": "COL",
    "dateTimeStr": "2026-06-18T02:00:00Z"
  },
  {
    "id": "M25",
    "matchNumber": 25,
    "type": "group",
    "group": "A",
    "homeTeamId": "CZE",
    "awayTeamId": "RSA",
    "dateTimeStr": "2026-06-18T16:00:00Z"
  },
  {
    "id": "M26",
    "matchNumber": 26,
    "type": "group",
    "group": "B",
    "homeTeamId": "SUI",
    "awayTeamId": "BIH",
    "dateTimeStr": "2026-06-18T19:00:00Z"
  },
  {
    "id": "M27",
    "matchNumber": 27,
    "type": "group",
    "group": "B",
    "homeTeamId": "CAN",
    "awayTeamId": "QAT",
    "dateTimeStr": "2026-06-18T22:00:00Z"
  },
  {
    "id": "M28",
    "matchNumber": 28,
    "type": "group",
    "group": "A",
    "homeTeamId": "MEX",
    "awayTeamId": "KOR",
    "dateTimeStr": "2026-06-19T01:00:00Z"
  },
  {
    "id": "M29",
    "matchNumber": 29,
    "type": "group",
    "group": "D",
    "homeTeamId": "USA",
    "awayTeamId": "AUS",
    "dateTimeStr": "2026-06-19T19:00:00Z"
  },
  {
    "id": "M30",
    "matchNumber": 30,
    "type": "group",
    "group": "C",
    "homeTeamId": "SCO",
    "awayTeamId": "MAR",
    "dateTimeStr": "2026-06-19T22:00:00Z"
  },
  {
    "id": "M31",
    "matchNumber": 31,
    "type": "group",
    "group": "C",
    "homeTeamId": "BRA",
    "awayTeamId": "HAI",
    "dateTimeStr": "2026-06-20T00:30:00Z"
  },
  {
    "id": "M32",
    "matchNumber": 32,
    "type": "group",
    "group": "D",
    "homeTeamId": "TUR",
    "awayTeamId": "PAR",
    "dateTimeStr": "2026-06-20T03:00:00Z"
  },
  {
    "id": "M33",
    "matchNumber": 33,
    "type": "group",
    "group": "F",
    "homeTeamId": "NED",
    "awayTeamId": "SWE",
    "dateTimeStr": "2026-06-20T17:00:00Z"
  },
  {
    "id": "M34",
    "matchNumber": 34,
    "type": "group",
    "group": "E",
    "homeTeamId": "GER",
    "awayTeamId": "CIV",
    "dateTimeStr": "2026-06-20T20:00:00Z"
  },
  {
    "id": "M35",
    "matchNumber": 35,
    "type": "group",
    "group": "E",
    "homeTeamId": "ECU",
    "awayTeamId": "CUR",
    "dateTimeStr": "2026-06-21T00:00:00Z"
  },
  {
    "id": "M36",
    "matchNumber": 36,
    "type": "group",
    "group": "F",
    "homeTeamId": "TUN",
    "awayTeamId": "JPN",
    "dateTimeStr": "2026-06-21T04:00:00Z"
  },
  {
    "id": "M37",
    "matchNumber": 37,
    "type": "group",
    "group": "H",
    "homeTeamId": "ESP",
    "awayTeamId": "KSA",
    "dateTimeStr": "2026-06-21T16:00:00Z"
  },
  {
    "id": "M38",
    "matchNumber": 38,
    "type": "group",
    "group": "G",
    "homeTeamId": "BEL",
    "awayTeamId": "IRN",
    "dateTimeStr": "2026-06-21T19:00:00Z"
  },
  {
    "id": "M39",
    "matchNumber": 39,
    "type": "group",
    "group": "H",
    "homeTeamId": "URY",
    "awayTeamId": "CPV",
    "dateTimeStr": "2026-06-21T22:00:00Z"
  },
  {
    "id": "M40",
    "matchNumber": 40,
    "type": "group",
    "group": "G",
    "homeTeamId": "NZL",
    "awayTeamId": "EGY",
    "dateTimeStr": "2026-06-22T01:00:00Z"
  },
  {
    "id": "M41",
    "matchNumber": 41,
    "type": "group",
    "group": "J",
    "homeTeamId": "ARG",
    "awayTeamId": "AUT",
    "dateTimeStr": "2026-06-22T17:00:00Z"
  },
  {
    "id": "M42",
    "matchNumber": 42,
    "type": "group",
    "group": "I",
    "homeTeamId": "FRA",
    "awayTeamId": "IRQ",
    "dateTimeStr": "2026-06-22T21:00:00Z"
  },
  {
    "id": "M43",
    "matchNumber": 43,
    "type": "group",
    "group": "I",
    "homeTeamId": "NOR",
    "awayTeamId": "SEN",
    "dateTimeStr": "2026-06-23T00:00:00Z"
  },
  {
    "id": "M44",
    "matchNumber": 44,
    "type": "group",
    "group": "J",
    "homeTeamId": "JOR",
    "awayTeamId": "ALG",
    "dateTimeStr": "2026-06-23T03:00:00Z"
  },
  {
    "id": "M45",
    "matchNumber": 45,
    "type": "group",
    "group": "K",
    "homeTeamId": "POR",
    "awayTeamId": "UZB",
    "dateTimeStr": "2026-06-23T17:00:00Z"
  },
  {
    "id": "M46",
    "matchNumber": 46,
    "type": "group",
    "group": "L",
    "homeTeamId": "ENG",
    "awayTeamId": "GHA",
    "dateTimeStr": "2026-06-23T20:00:00Z"
  },
  {
    "id": "M47",
    "matchNumber": 47,
    "type": "group",
    "group": "L",
    "homeTeamId": "PAN",
    "awayTeamId": "CRO",
    "dateTimeStr": "2026-06-23T23:00:00Z"
  },
  {
    "id": "M48",
    "matchNumber": 48,
    "type": "group",
    "group": "K",
    "homeTeamId": "COL",
    "awayTeamId": "COD",
    "dateTimeStr": "2026-06-24T02:00:00Z"
  },
  {
    "id": "M49",
    "matchNumber": 49,
    "type": "group",
    "group": "B",
    "homeTeamId": "SUI",
    "awayTeamId": "CAN",
    "dateTimeStr": "2026-06-24T19:00:00Z"
  },
  {
    "id": "M50",
    "matchNumber": 50,
    "type": "group",
    "group": "B",
    "homeTeamId": "BIH",
    "awayTeamId": "QAT",
    "dateTimeStr": "2026-06-24T19:00:00Z"
  },
  {
    "id": "M51",
    "matchNumber": 51,
    "type": "group",
    "group": "C",
    "homeTeamId": "MAR",
    "awayTeamId": "HAI",
    "dateTimeStr": "2026-06-24T22:00:00Z"
  },
  {
    "id": "M52",
    "matchNumber": 52,
    "type": "group",
    "group": "C",
    "homeTeamId": "SCO",
    "awayTeamId": "BRA",
    "dateTimeStr": "2026-06-24T22:00:00Z"
  },
  {
    "id": "M53",
    "matchNumber": 53,
    "type": "group",
    "group": "A",
    "homeTeamId": "CZE",
    "awayTeamId": "MEX",
    "dateTimeStr": "2026-06-25T01:00:00Z"
  },
  {
    "id": "M54",
    "matchNumber": 54,
    "type": "group",
    "group": "A",
    "homeTeamId": "RSA",
    "awayTeamId": "KOR",
    "dateTimeStr": "2026-06-25T01:00:00Z"
  },
  {
    "id": "M55",
    "matchNumber": 55,
    "type": "group",
    "group": "E",
    "homeTeamId": "ECU",
    "awayTeamId": "GER",
    "dateTimeStr": "2026-06-25T20:00:00Z"
  },
  {
    "id": "M56",
    "matchNumber": 56,
    "type": "group",
    "group": "E",
    "homeTeamId": "CUR",
    "awayTeamId": "CIV",
    "dateTimeStr": "2026-06-25T20:00:00Z"
  },
  {
    "id": "M57",
    "matchNumber": 57,
    "type": "group",
    "group": "F",
    "homeTeamId": "TUN",
    "awayTeamId": "NED",
    "dateTimeStr": "2026-06-25T23:00:00Z"
  },
  {
    "id": "M58",
    "matchNumber": 58,
    "type": "group",
    "group": "F",
    "homeTeamId": "JPN",
    "awayTeamId": "SWE",
    "dateTimeStr": "2026-06-25T23:00:00Z"
  },
  {
    "id": "M59",
    "matchNumber": 59,
    "type": "group",
    "group": "D",
    "homeTeamId": "TUR",
    "awayTeamId": "USA",
    "dateTimeStr": "2026-06-26T02:00:00Z"
  },
  {
    "id": "M60",
    "matchNumber": 60,
    "type": "group",
    "group": "D",
    "homeTeamId": "PAR",
    "awayTeamId": "AUS",
    "dateTimeStr": "2026-06-26T02:00:00Z"
  },
  {
    "id": "M61",
    "matchNumber": 61,
    "type": "group",
    "group": "I",
    "homeTeamId": "NOR",
    "awayTeamId": "FRA",
    "dateTimeStr": "2026-06-26T19:00:00Z"
  },
  {
    "id": "M62",
    "matchNumber": 62,
    "type": "group",
    "group": "I",
    "homeTeamId": "SEN",
    "awayTeamId": "IRQ",
    "dateTimeStr": "2026-06-26T19:00:00Z"
  },
  {
    "id": "M63",
    "matchNumber": 63,
    "type": "group",
    "group": "H",
    "homeTeamId": "URY",
    "awayTeamId": "ESP",
    "dateTimeStr": "2026-06-27T00:00:00Z"
  },
  {
    "id": "M64",
    "matchNumber": 64,
    "type": "group",
    "group": "H",
    "homeTeamId": "CPV",
    "awayTeamId": "KSA",
    "dateTimeStr": "2026-06-27T00:00:00Z"
  },
  {
    "id": "M65",
    "matchNumber": 65,
    "type": "group",
    "group": "G",
    "homeTeamId": "NZL",
    "awayTeamId": "BEL",
    "dateTimeStr": "2026-06-27T03:00:00Z"
  },
  {
    "id": "M66",
    "matchNumber": 66,
    "type": "group",
    "group": "G",
    "homeTeamId": "EGY",
    "awayTeamId": "IRN",
    "dateTimeStr": "2026-06-27T03:00:00Z"
  },
  {
    "id": "M67",
    "matchNumber": 67,
    "type": "group",
    "group": "L",
    "homeTeamId": "PAN",
    "awayTeamId": "ENG",
    "dateTimeStr": "2026-06-27T21:00:00Z"
  },
  {
    "id": "M68",
    "matchNumber": 68,
    "type": "group",
    "group": "L",
    "homeTeamId": "CRO",
    "awayTeamId": "GHA",
    "dateTimeStr": "2026-06-27T21:00:00Z"
  },
  {
    "id": "M69",
    "matchNumber": 69,
    "type": "group",
    "group": "K",
    "homeTeamId": "COL",
    "awayTeamId": "POR",
    "dateTimeStr": "2026-06-27T23:30:00Z"
  },
  {
    "id": "M70",
    "matchNumber": 70,
    "type": "group",
    "group": "K",
    "homeTeamId": "COD",
    "awayTeamId": "UZB",
    "dateTimeStr": "2026-06-27T23:30:00Z"
  },
  {
    "id": "M71",
    "matchNumber": 71,
    "type": "group",
    "group": "J",
    "homeTeamId": "JOR",
    "awayTeamId": "ARG",
    "dateTimeStr": "2026-06-28T02:00:00Z"
  },
  {
    "id": "M72",
    "matchNumber": 72,
    "type": "group",
    "group": "J",
    "homeTeamId": "ALG",
    "awayTeamId": "AUT",
    "dateTimeStr": "2026-06-28T02:00:00Z"
  }
];


export async function seedDatabase(dataSource: DataSource) {
  const teamRepo = dataSource.getRepository(Team);
  const matchRepo = dataSource.getRepository(Match);
  const userRepo = dataSource.getRepository(User);
  const predictionRepo = dataSource.getRepository(UserPrediction);

  console.log('[Seed] Starting database seed...');
  const testMatch = await matchRepo.findOne({ where: { id: 'M01' }, relations: ['homeTeam', 'awayTeam'] });
  console.log('TEST MATCH M01:', JSON.stringify(testMatch, null, 2));

  // Check if we need to reset/re-seed because of outdated teams
  const costaRica = await teamRepo.findOne({ where: { id: 'CRC' } });
  const needsReset = !!costaRica; // Costa Rica is not in fixtures.json, so if it exists, it's outdated

  if (needsReset) {
    console.log('[Seed] Outdated database schema detected. Resetting teams and matches...');
    await predictionRepo.createQueryBuilder().delete().execute();
    await matchRepo.createQueryBuilder().delete().execute();
    await teamRepo.createQueryBuilder().delete().execute();
  }

  // 1. Seed Teams
  const teamCount = await teamRepo.count();

  // Load FIFA rankings from teams_ranking.csv
  const possibleRankingPaths = [
    path.join(__dirname, '..', '..', 'uploads', 'teams_ranking.csv'),
    path.join(process.cwd(), 'uploads', 'teams_ranking.csv'),
    path.join(__dirname, '..', '..', 'teams_ranking.csv'),
    '/app/uploads/teams_ranking.csv',
    '/usr/src/app/uploads/teams_ranking.csv',
    'd:\\Code\\worldcup\\api\\uploads\\teams_ranking.csv',
    'd:\\Code\\worldcup\\teams_ranking.csv'
  ];
  let rankingCsvPath = '';
  for (const p of possibleRankingPaths) {
    if (fs.existsSync(p)) {
      rankingCsvPath = p;
      break;
    }
  }

  const rankingsMap = new Map<string, number>();
  const normalizeName = (name: string): string => {
    const norm = name.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // strip accents
    if (norm === 'united states' || norm === 'usa') return 'usa';
    if (norm === 'turkey' || norm === 'turkiye') return 'turkiye';
    if (norm === 'ivory coast' || norm === "cote d'ivoire") return 'cote d\'ivoire';
    if (norm === 'iran' || norm === 'ir iran') return 'iran';
    if (norm === 'cape verde' || norm === 'cabo verde') return 'cabo verde';
    if (norm === 'bosnia-herzegovina' || norm === 'bosnia & herzegovina') return 'bosnia & herzegovina';
    return norm;
  };

  if (rankingCsvPath) {
    console.log(`[Seed] Loading FIFA rankings from ${rankingCsvPath}...`);
    const csvData = fs.readFileSync(rankingCsvPath, 'utf-8');
    const lines = csvData.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(',');
      if (parts.length < 3) continue;

      const teamName = parts[0].trim();
      const groupName = parts[1].trim();
      const rankingStr = parts[2].trim();

      if (teamName.toLowerCase() === 'team' && rankingStr.toLowerCase() === 'fifa ranking') {
        continue; // header
      }

      const ranking = parseInt(rankingStr, 10);
      if (!isNaN(ranking)) {
        const key = `${normalizeName(teamName)}_${groupName.trim().toLowerCase()}`;
        rankingsMap.set(key, ranking);
      }
    }
  } else {
    console.warn(`[Seed] teams_ranking.csv not found at searched paths:`, possibleRankingPaths);
  }

  if (teamCount === 0) {
    const teamsToCreate = seededTeams.map(t => {
      const key = `${normalizeName(t.name)}_${t.group.trim().toLowerCase()}`;
      const ranking = rankingsMap.get(key) || null;
      return teamRepo.create({
        ...t,
        fifaRanking: ranking
      });
    });
    await teamRepo.save(teamsToCreate);
    console.log(`[Seed] Seeded ${teamsToCreate.length} teams with FIFA rankings.`);
  } else {
    console.log('[Seed] Teams already seeded. Verifying/updating FIFA rankings...');
    const existingTeams = await teamRepo.find();
    let updatedCount = 0;
    for (const team of existingTeams) {
      const key = `${normalizeName(team.name)}_${team.group.trim().toLowerCase()}`;
      const ranking = rankingsMap.get(key) || null;
      if (team.fifaRanking !== ranking) {
        team.fifaRanking = ranking;
        await teamRepo.save(team);
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      console.log(`[Seed] Updated FIFA rankings for ${updatedCount} teams.`);
    } else {
      console.log('[Seed] All team FIFA rankings are up to date.');
    }
  }

  // 2. Seed Group Matches
  const matchCount = await matchRepo.count();
  if (matchCount === 0) {
    const matchesToCreate = seededMatches.map(m => matchRepo.create({
      id: m.id,
      matchNumber: m.matchNumber,
      type: m.type,
      group: m.group,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      dateTime: new Date(m.dateTimeStr),
      status: 'pending',
      homeScore: null,
      awayScore: null
    }));
    await matchRepo.save(matchesToCreate);
    console.log(`[Seed] Seeded ${matchesToCreate.length} group stage fixtures.`);
  } else {
    console.log('[Seed] Matches already seeded.');
  }

  // 3. Seed Admin and Users
  const userCount = await userRepo.count();
  if (userCount === 0) {
    const defaultPasswordHash = (pwd: string) => crypto.createHash('sha256').update(pwd).digest('hex');

    // Admin user (pre-activated password)
    const adminUser = userRepo.create({
      email: 'admin@worldcup.com',
      displayName: 'System Admin',
      empId: 'ADMIN1',
      colorTeam: null,
      password: defaultPasswordHash('T8#pW3@zH6!nY2$k'),
      isPasswordSet: true,
      role: 'admin',
      points: 0
    });
    await userRepo.save(adminUser);
    console.log('[Seed] Seeded admin user.');

    // Seed real users from users.csv
    const possibleUserPaths = [
      path.join(__dirname, '..', '..', 'uploads', 'users.csv'),
      path.join(process.cwd(), 'uploads', 'users.csv'),
      path.join(__dirname, '..', '..', 'users.csv'),
      '/app/uploads/users.csv',
      '/usr/src/app/uploads/users.csv',
      'd:\\Code\\worldcup\\api\\uploads\\users.csv',
      'd:\\Code\\worldcup\\users.csv'
    ];
    let userCsvPath = '';
    for (const p of possibleUserPaths) {
      if (fs.existsSync(p)) {
        userCsvPath = p;
        break;
      }
    }

    if (userCsvPath) {
      console.log(`[Seed] Seeding users from users.csv at ${userCsvPath}...`);
      const csvData = fs.readFileSync(userCsvPath, 'utf-8');
      const lines = csvData.split(/\r?\n/);
      const usersList: User[] = [];
      const seenEmails = new Set<string>();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(',');
        if (parts.length < 3) continue;

        const empId = parts[0].trim();
        const displayName = parts[1].trim();
        const email = parts[2].trim().toLowerCase();
		const colorTeam = parts[3].trim();		

        if (empId.toLowerCase() === 'empid' || email.toLowerCase() === 'email') {
          continue; // header line
        }

        // Avoid duplicate seeding of admin or other duplicate rows in the CSV
        if (email === 'admin@worldcup.com') continue;
        if (seenEmails.has(email)) continue;
        seenEmails.add(email);

        const user = userRepo.create({
          email: email,
          displayName: displayName,
          empId: empId,
          colorTeam: colorTeam,
          password: null,
          isPasswordSet: false,
          role: 'user',
          points: 0
        });
        usersList.push(user);
      }

      if (usersList.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < usersList.length; i += chunkSize) {
          const chunk = usersList.slice(i, i + chunkSize);
          await userRepo.save(chunk);
        }
        console.log(`[Seed] Seeded ${usersList.length} real users from CSV.`);
      }
    } else {
      console.warn(`[Seed] users.csv not found at searched paths:`, possibleUserPaths);
    }
  } else {
    console.log('[Seed] Users already seeded.');
  }

  // 4. Seed Players
  const playerRepo = dataSource.getRepository(Player);
  const playerCount = await playerRepo.count();
  const needsPositionMigration = playerCount > 0 && (await playerRepo.createQueryBuilder('p').where('p.position IS NULL').getOne());

  if (playerCount === 0 || needsPositionMigration) {
    if (needsPositionMigration) {
      console.log('[Seed] Database has players without positions. Clearing players for migration...');
      await playerRepo.delete({});
    }
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'uploads', 'team_squads.csv'),
      path.join(process.cwd(), 'uploads', 'team_squads.csv'),
      path.join(__dirname, '..', '..', 'team_squads.csv'),
      '/app/uploads/team_squads.csv',
      '/usr/src/app/uploads/team_squads.csv',
      'd:\\Code\\worldcup\\api\\uploads\\team_squads.csv',
      'd:\\Code\\worldcup\\team_squads.csv'
    ];
    let csvPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }

    if (csvPath) {
      console.log(`[Seed] Seeding players from team_squads.csv at ${csvPath}...`);
      const teams = await teamRepo.find();
      const teamNameToIdMap = new Map<string, string>();
      for (const t of teams) {
        teamNameToIdMap.set(t.name.trim().toLowerCase(), t.id);
      }

      const normalizeTeamName = (name: string): string => {
        const norm = name.trim().toLowerCase();
        if (norm === 'czech republic') return 'czechia';
        if (norm === 'usa') return 'united states';
        if (norm === 'curacao') return 'curaçao';
        if (norm === 'cape verde') return 'cape verde islands';
        if (norm === 'dr congo') return 'congo dr';
        return name.trim();
      };

      const csvData = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvData.split(/\r?\n/);
      const playersList: Player[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(',');
        if (parts.length < 4) continue;

        const teamName = parts[0].trim();
        const groupName = parts[1].trim();
        const playerName = parts[2].trim();
        const position = parts[3].trim();

        if (teamName.toLowerCase() === 'team name' && playerName.toLowerCase() === 'player name') {
          continue; // header
        }

        const matchedTeamName = normalizeTeamName(teamName);
        const teamId = teamNameToIdMap.get(matchedTeamName.toLowerCase());

        if (teamId && playerName && position) {
          const player = playerRepo.create({
            name: playerName,
            teamId: teamId,
            position: position
          });
          playersList.push(player);
        }
      }

      if (playersList.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < playersList.length; i += chunkSize) {
          const chunk = playersList.slice(i, i + chunkSize);
          await playerRepo.save(chunk);
        }
        console.log(`[Seed] Seeded ${playersList.length} players.`);
      }
    } else {
      console.warn(`[Seed] team_squads.csv not found at searched paths:`, possiblePaths);
    }
  } else {
    console.log('[Seed] Players already seeded.');
  }

  console.log('[Seed] Database seed completed successfully!');
}
