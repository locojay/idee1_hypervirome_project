'use strict';

const fs = require('fs');

const OUTPUT_FILE_CSV = '../data/processed/tree-data.csv';
const OUTPUT_FILE_TSV = '../data/processed/tree-data.tsv';

const json = JSON.parse(fs.readFileSync('../data/raw/ncov.json'));
const divisions = json.meta.geo_resolutions.find(val => val.key === 'division').demes;

// table header
const header = [
  'name',
  'parent',
  'mutations',
  'clade',
  'division',
  'country',
  'long',
  'lat',
  'nuc',
  'sampling_date', // num_date
  'originating_lab', 
  'submitting_lab',
  'GISAID_EPI_ISL',
  'GenBank_accession'
];

function writeCsv(rows) {
  const csvRows = rows.filter(row => !!row).map(row => {
    return [
      row.name,
      row.parent,
      row.mutations, 
      row.clade,
      row.division,
      row.country,
      row.long,
      row.lat,
      row.nuc,
      row.sampling_date,
      row.originating_lab,
      row.submitting_lab,
      row.gisaid,
      row.genbank
    ].map(val => {
      if (val && val.split && val.split(',').length > 1) {
        return val.replace(', ', '_');
      }
      return val;
    })
    .join(', ');
  
  }).join('\n');
  
  fs.writeFileSync(OUTPUT_FILE_CSV, header.join(', ')+'\n'+csvRows+'\n');
}

function writeTsv(rows) {  
  const tsvRows = rows.filter(row => !!row).map(row => {
    return [
      row.name,
      row.parent,
      row.mutations, 
      row.clade,
      row.division,
      row.country,
      row.long,
      row.lat,
      row.nuc,
      row.sampling_date,
      row.originating_lab,
      row.submitting_lab,
      row.gisaid,
      row.genbank
    ]
    .join('\t');
  
  }).join('\n');
  fs.writeFileSync(OUTPUT_FILE_TSV, header.join('\t')+'\n'+tsvRows);
}

function processTreeNode(tree, rows){
  if (tree.children && tree.children.length > 0) {    
    tree.children.forEach((node) => { 
      let entry = {};
      // mutation name
      entry['name'] = node.name;
      entry['parent'] = tree.name;

      // get division
      entry['division'] = node.node_attrs.division.value;

      // get locations
      if (divisions[entry.division]) {
        entry['long'] = divisions[entry.division].longitude;
        entry['lat'] = divisions[entry.division].latitude;
      }
      
      // country if exists
      if (node.node_attrs && node.node_attrs.country) {
        entry['country'] = node.node_attrs.country.value;
      }

      // get clade if exists
      if (node.node_attrs.clade_membership) {
        entry['clade'] = node.node_attrs.clade_membership.value;
      } else if (node.branch_attrs && node.branch_attrs.labels && node.branch_attrs.labels.clade) {
        entry['clade'] = node.branch_attrs.labels.clade;
      }
      // get labs if exists
      if (node.node_attrs.originating_lab) {
        entry['originating_lab'] = node.node_attrs.originating_lab.value;
      }
      if (node.node_attrs.submitting_lab) {
        entry['submitting_lab'] = node.node_attrs.submitting_lab.value;
      }

      // sampling_date if exists
      if (node.node_attrs.num_date) {
        entry['sampling_date'] = node.node_attrs.num_date.value;
      }
      
      // get mutations if exists
      if (node.branch_attrs && node.branch_attrs.labels) {
        entry['mutations'] = node.branch_attrs.labels.aa;
      }
      // get nuc as string if exists
      if (node.branch_attrs && node.branch_attrs.mutations && node.branch_attrs.mutations.nuc) {
        entry['nuc'] = node.branch_attrs.mutations.nuc.join('-');
      }

      // get genbank and gisaid if exists
      if (node.node_attrs.genbank_accession) {
        entry['genbank'] = node.node_attrs.genbank_accession.value;
      }
      if (node.node_attrs.gisaid_epi_isl) {
        entry['gisaid'] = node.node_attrs.gisaid_epi_isl.value;
      }

      rows.push(entry);
      processTreeNode(node, rows);
    });
  }
}

let rows = [];

processTreeNode(json.tree, rows);
writeCsv(rows);
writeTsv(rows);
