#!/usr/bin/env python3
"""PCP Simulador — Projeto PIVIC Nº 391/2025 — UFU/FAGEN"""
import subprocess, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
print("=" * 50)
print("  PCP SIMULADOR — UFU/FAGEN  |  PIVIC 391/2025")
print("=" * 50)
print("  Acessar: http://localhost:5000\n")
os.system(f"{sys.executable} app.py")
