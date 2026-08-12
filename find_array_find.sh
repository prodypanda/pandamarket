#!/bin/bash
grep -rn "\.find(" backend/src/services/ | grep -v "\.test\.ts"
