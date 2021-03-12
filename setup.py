#!/usr/bin/env python

import os
import sys

from setuptools import setup, find_packages
from setuptools.command.develop import develop
from setuptools.command.install import install
from setuptools.command.sdist import sdist



def _build_js():
    from bokeh.ext import build
    print("Building custom models:")
    module_dir = os.path.join(os.path.dirname(__file__), "pcp")
    build(module_dir)
    if sys.platform != "win32":
        # npm can cause non-blocking stdout; so reset it just in case
        import fcntl
        flags = fcntl.fcntl(sys.stdout, fcntl.F_GETFL)
        fcntl.fcntl(sys.stdout, fcntl.F_SETFL, flags&~os.O_NONBLOCK)


class CustomDevelopCommand(develop):
    """Custom installation for development mode."""

    def run(self):
        _build_js()
        develop.run(self)


class CustomInstallCommand(install):
    """Custom installation for install mode."""

    def run(self):
        _build_js()
        install.run(self)


class CustomSdistCommand(sdist):
    """Custom installation for sdist mode."""

    def run(self):
        _build_js()
        sdist.run(self)


_COMMANDS = {
    'develop': CustomDevelopCommand,
    'install': CustomInstallCommand,
    'sdist':   CustomSdistCommand,
}

try:
    from wheel.bdist_wheel import bdist_wheel

    class CustomBdistWheelCommand(bdist_wheel):
        """Custom bdist_wheel command to force cancelling qiskit-terra wheel
        creation."""

        def run(self):
            """Do nothing so the command intentionally fails."""
            _build_js()
            bdist_wheel.run(self)

    _COMMANDS['bdist_wheel'] = CustomBdistWheelCommand
except Exception:
    pass

########## dependencies ##########

install_requires = [
    'bokeh >=2.3.0,<2.4.0',
    'panel'
]

setup_args = dict(
    name='pcp',
    version="0.0.1",
    description='A bokeh parallel plot extension.',
    author="XAR",
    author_email="xavier.artusi@cea.fr",
    platforms=['Windows', 'Mac OS X', 'Linux'],
    license='BSD',
    url='http://panel.holoviz.org',
    cmdclass=_COMMANDS,
    packages=find_packages(),
    include_package_data=True,
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Development Status :: 5 - Production/Stable",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Operating System :: OS Independent",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Intended Audience :: Financial and Insurance Industry",
        "Intended Audience :: Healthcare Industry",
        "Intended Audience :: Information Technology",
        "Intended Audience :: Legal Industry",
        "Intended Audience :: Other Audience",
        "Intended Audience :: Science/Research",
        "Natural Language :: English",
        "Topic :: Scientific/Engineering",
        "Topic :: Scientific/Engineering :: Visualization",
        "Topic :: Scientific/Engineering :: Information Analysis",
        "Topic :: Office/Business",
        "Topic :: Office/Business :: Financial",
        "Topic :: Software Development :: Libraries"],
    python_requires=">=3.6",
    entry_points={
        'console_scripts': [
            'panel = panel.command:main'
        ]
    },
    install_requires=install_requires,
)

def clean_js_version(version):
    version = version.replace('-', '')
    for dev in ('a', 'b', 'rc'):
        version = version.replace(dev+'.', dev)
    return version

setup(**setup_args)
