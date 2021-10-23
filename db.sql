-- CREATE DATABASE pos;
-- \c erp
-- set extension
-- CREATE extension IF NOT EXISTS "uuid-ossp";
-- Create roles table
CREATE TABLE roles (name TEXT PRIMARY KEY);
-- Create users table
CREATE TABLE users (
    name TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL REFERENCES roles(name),
    is_priviledged BOOLEAN NOT NULL DEFAULT FALSE
);
-- Create shops table
CREATE TABLE shops (
    name TEXT PRIMARY KEY,
    license TEXT NOT NULL
);
-- CREATE domains table
CREATE TABLE domains (
    username TEXT NOT NULL REFERENCES users(name),
    shop TEXT NOT NULL REFERENCES shops(name)
);
-- Create brands table
CREATE TABLE brands (name TEXT PRIMARY KEY);
-- Create categories table
CREATE TABLE categories (name TEXT PRIMARY KEY);
-- Create sizes table
CREATE TABLE sizes (size INTEGER PRIMARY KEY);
-- Create products table
CREATE TABLE products (
    name TEXT PRIMARY KEY,
    brand TEXT NOT NULL REFERENCES brands(name),
    category TEXT NOT NULL REFERENCES categories(name),
    size INTEGER NOT NULL REFERENCES sizes(size),
    barcode TEXT UNIQUE,
    per_case INTEGER NOT NULL,
    purchase_price DECIMAL(10, 2) NOT NULL,
    case_price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    mrp1 DECIMAL(10, 2),
    mrp2 DECIMAL(10, 2),
    mrp3 DECIMAL(10, 2),
    mrp4 DECIMAL(10, 2)
);
-- Create stock table
CREATE TABLE stock (
    product TEXT NOT NULL REFERENCES products(name),
    shop TEXT NOT NULL REFERENCES shops(name),
    stock INTEGER NOT NULL
);
-- add roles
INSERT INTO roles
VALUES ('admin'),
    ('shop'),
    ('accountant');
-- add brands
INSERT INTO brands(name)
VALUES('ABINBEV'),
    ('ASPRAIN'),
    ('B9 BEVERAGES'),
    ('CARLSBERG'),
    ('KALS'),
    ('SOM'),
    ('UB'),
    ('JP DISTILLERIES'),
    ('KALPATARU DISTI'),
    ('BACARDI'),
    ('AMRUT DISTILLERIES'),
    ('DIAGEO'),
    ('KHODAYS'),
    ('UGAR SUGARS'),
    ('UNITED SPIRITS'),
    ('RADICO'),
    ('SEAGRAM''S'),
    ('AB D'),
    ('BEAM GLOBAL'),
    ('JHONS'),
    ('UNIBIV'),
    ('BANGALORE'),
    ('ELITE'),
    ('FRATELLI'),
    ('GROVER'),
    ('INODOSPIRIT BEVERAGES'),
    ('RICO'),
    ('SULA');
-- add categories
INSERT INTO categories(name)
VALUES('BEER'),
    ('BREEZER'),
    ('BRANDY'),
    ('GIN'),
    ('LIQUEUR'),
    ('RUM'),
    ('TEQUILA'),
    ('VODKA'),
    ('WHISKY'),
    ('WINE');
-- add sizes
INSERT INTO sizes (size)
VALUES (50),
    (60),
    (90),
    (180),
    (187),
    (200),
    (250),
    (275),
    (330),
    (375),
    (500),
    (650),
    (700),
    (750),
    (1000);