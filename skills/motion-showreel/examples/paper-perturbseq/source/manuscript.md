# Genome-scale Perturb-seq maps the regulators of T-cell exhaustion

*Preprint · fictional manuscript written for this example · all data simulated (paper-src/simulate.py)*

Dana R. Okafor¹, Lin Wei², Priya Raman¹ & Mateo Ferreyra¹ ✉ · ¹Center for Immune Engineering (fictional) · ²Single-Cell Core

## Abstract
Chronically stimulated T cells lose their ability to kill. To find the genes that drive this exhaustion, we knocked
out 612 transcription factors and chromatin regulators one at a time in primary human CD8⁺ T cells with pooled
CRISPR screens and read out each perturbation's full transcriptome by single-cell RNA sequencing (Perturb-seq;
1.2 million cells, 9 donors). Perturbations fall into five programmes. A small regulatory hub, led by TOX with
NR4A1 and ARID1A, holds the exhaustion programme in place: knocking out any one of the three restores effector
genes, and the triple knockout raises tumour-cell killing by 45% in co-culture.

## Figure 1 | Perturb-seq of exhaustion
**a**, Pooled CRISPR knockout of 612 regulators; every cell carries one guide, read alongside its transcriptome.
The figure shows one guide as an example: TOX sgRNA 5′-GACCTTCAGCAATGTCTACG-3′ (an illustrative sequence).
**b**, Effect of each perturbation (rows) on 40 programme genes (columns), clustered; colour, log2 fold change.
**c**, Regulatory network inferred from shared effects; edges, positive (magenta) or negative (cyan) regulation.
**d**, Killing assay: triple knockout vs control guides.

## Key numbers (simulated)
612 regulators · 1.2 M cells · 9 donors · 5 programmes · +45% killing (triple KO)

## Style of the preprint
Dark figure panels with a diverging cyan–grey–magenta scale, IBM Plex for text and Plex Mono for every gene name
and number, guide sequences shown as monospaced ACGT.
