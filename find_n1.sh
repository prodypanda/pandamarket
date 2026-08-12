#!/bin/bash
grep -rn "await query" backend/src/services/ | grep -E "for |while |map|forEach"
